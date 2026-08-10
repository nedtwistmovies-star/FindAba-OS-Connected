```ts
import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import axios from "axios";
import { supabase } from "../services/supabase";
import { ensureAdmin } from "../middleware/admin";
import { env, publicConfig } from "../services/env";

export const adminRouter = Router();

/**
 * GET /api/config
 *
 * Public configuration endpoint.
 *
 * Admin detection is optional. Failure to authenticate an admin
 * must never cause this endpoint to return a 500 error.
 *
 * Public requests receive publicConfig(false).
 * Authenticated admin requests receive publicConfig(true).
 */
adminRouter.get("/config", async (req, res) => {
  let isAdmin = false;

  try {
    const authHeader = req.headers.authorization;

    /*
     * Admin detection is optional.
     *
     * If there is no Authorization header, this remains a
     * completely public request and does not contact Supabase.
     */
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();

      if (token) {
        try {
          const { data, error } = await supabase.auth.getUser(token);

          if (!error && data?.user) {
            const user = data.user;

            /*
             * Master admin check.
             */
            if (user.email === env.MASTER_ADMIN_EMAIL) {
              isAdmin = true;
            } else {
              /*
               * Database admin-role check.
               *
               * maybeSingle() is intentionally used instead of
               * single() so a missing profile does not generate
               * an unnecessary Supabase error.
               */
              const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .maybeSingle();

              if (profile?.role === "admin") {
                isAdmin = true;
              }
            }
          }
        } catch (authError) {
          /*
           * Authentication failure must NOT break /api/config.
           * Fall back to public configuration.
           */
          console.warn(
            "[Admin] /api/config admin detection failed; returning public config:",
            authError instanceof Error
              ? authError.message
              : authError
          );
        }
      }
    }

    /*
     * Always return configuration successfully.
     */
    return res.status(200).json(publicConfig(isAdmin));
  } catch (error) {
    /*
     * Final safety net.
     *
     * Even if something unexpected happens while preparing
     * the configuration, the endpoint returns HTTP 200 with
     * the safe public configuration instead of crashing.
     */
    console.error("[Admin] /api/config failed:", error);

    return res.status(200).json({
      ...publicConfig(false),
      isAdminDetected: false,
    });
  }
});

/**
 * GitHub diagnostic (admin only).
 */
adminRouter.get("/git/diagnostic", ensureAdmin, async (req, res) => {
  const token = env.GITHUB_TOKEN;

  const diagnostic: any = {
    env_repo: env.GITHUB_REPO,
    has_token: !!token,
    token_preview: token
      ? `${token.substring(0, 4)}...${token.substring(token.length - 4)}`
      : "missing",
  };

  if (token) {
    try {
      const response = await axios.get("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "FindAba-City-OS",
          Accept: "application/vnd.github.v3+json",
        },
      });

      diagnostic.github_api = {
        status: "authenticated",
        user: response.data.login,
      };
    } catch (err: any) {
      diagnostic.github_api = {
        status: "auth_failed",
        error: err.message,
      };
    }
  } else {
    diagnostic.github_api = {
      status: "public_only",
      warning:
        "No GITHUB_TOKEN configured. Rate limits will apply.",
    };
  }

  res.json(diagnostic);
});

/**
 * Basic network diagnostic (admin only).
 */
adminRouter.get("/debug/network", ensureAdmin, async (req, res) => {
  const results: any = {
    timestamp: new Date().toISOString(),
    connectivity: {},
  };

  const targets = [
    {
      name: "github",
      url: "https://api.github.com/zen",
    },
    {
      name: "supabase",
      url: env.SUPABASE_URL,
    },
    {
      name: "google",
      url: "https://www.google.com",
    },
  ];

  for (const target of targets) {
    try {
      const start = Date.now();

      await axios.get(target.url, {
        timeout: 5000,
      });

      results.connectivity[target.name] = {
        status: "ok",
        latency: `${Date.now() - start}ms`,
      };
    } catch (err: any) {
      results.connectivity[target.name] = {
        status: "error",
        message: err.message,
        code: err.code,
      };
    }
  }

  res.json(results);
});

/**
 * Read README.md.
 */
adminRouter.get("/readme", async (req, res) => {
  try {
    const readmePath = path.join(process.cwd(), "README.md");
    const content = await fs.readFile(readmePath, "utf-8");

    res.json({
      content,
    });
  } catch {
    res.status(404).json({
      error: "README.md not found",
    });
  }
});

/**
 * Update metadata.json (admin only).
 */
adminRouter.post("/metadata", ensureAdmin, async (req, res) => {
  try {
    const metadataPath = path.join(process.cwd(), "metadata.json");

    await fs.writeFile(
      metadataPath,
      JSON.stringify(req.body, null, 2)
    );

    res.json({
      success: true,
      message: "Metadata updated successfully",
    });
  } catch (error: any) {
    console.error(
      "[Admin] Failed to update metadata:",
      error
    );

    res.status(500).json({
      error: "Failed to update metadata",
      details: error.message,
    });
  }
});
```
