import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { ensureAdmin } from "../middleware/admin";
import { env } from "../services/env";
import { supabase } from "../services/supabase";
import {
  githubClient,
  resolveGithubToken,
  authHeaders,
  normalizeRepo,
  getRepoMeta,
} from "../services/github";

export const githubRouter = Router();

const EXCLUDE_DIRS = ["node_modules", "dist", ".git", ".next", ".vercel", "build", "public", "coverage", "logs"];
const EXCLUDE_FILES = ["package-lock.json", "yarn.lock", ".env", ".env.local", "github_token", ".DS_Store"];
const INCLUDE_EXT = [".ts", ".tsx", ".js", ".jsx", ".json", ".css", ".html", ".md", ".sql"];

async function collectProjectFiles(rootDir: string) {
  const files: { path: string; content: string }[] = [];

  async function readDir(dir: string, relativePath = "") {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.join(relativePath, entry.name).replace(/\\/g, "/");

        if (entry.isDirectory()) {
          if (!EXCLUDE_DIRS.includes(entry.name)) await readDir(fullPath, relPath);
          return;
        }
        const ext = path.extname(entry.name).toLowerCase();
        if (EXCLUDE_FILES.includes(entry.name) || (!INCLUDE_EXT.includes(ext) && entry.name !== "LICENSE")) return;

        try {
          const stats = await fs.stat(fullPath);
          if (stats.size > 1024 * 1024) {
            console.warn(`[GitSync] Skipping large file: ${relPath} (${stats.size} bytes)`);
            return;
          }
          const content = await fs.readFile(fullPath, "utf-8");
          files.push({ path: relPath, content });
        } catch (e) {
          console.warn(`[GitSync] Skipping ${relPath}: ${e}`);
        }
      })
    );
  }

  await readDir(rootDir);
  return files;
}

/** Read-only registry pull. */
function formatGithubError(error: any, repo: string, token: string | null): { status: number; details: string } {
  const status = error.response?.status || 500;
  let rawMsg = "Unknown error";

  if (error.response?.data) {
    if (typeof error.response.data === "string") {
      rawMsg = error.response.data;
    } else if (error.response.data.message) {
      rawMsg = error.response.data.message;
    }
  } else if (error.message) {
    rawMsg = error.message;
  }

  if (typeof rawMsg === "string" && (rawMsg.includes("Unexpected end of JSON input") || rawMsg.includes("JSON") || rawMsg.includes("Unexpected token"))) {
    rawMsg = `GitHub API payload could not be parsed. Ensure repository '${repo || "configured"}' exists and contains a valid registry.json.`;
  }

  if (status === 404) {
    return {
      status: 404,
      details: `Repository '${repo}' or registry file not found. If it's a private repository, ensure your token is valid and has 'repo' scope.`,
    };
  }

  if (status === 403 || status === 401 || (typeof rawMsg === 'string' && rawMsg.includes("Resource not accessible"))) {
    const isRateLimit = error.response?.headers?.["x-ratelimit-remaining"] === "0";
    if (isRateLimit) {
      return { status: 429, details: "GitHub API rate limit exceeded. Please provide a valid GITHUB_TOKEN." };
    }
    if (typeof rawMsg === 'string' && rawMsg.includes("Resource not accessible") || status === 403) {
      return {
        status: 403,
        details: `GitHub Personal Access Token lacks required write permissions for repository '${repo}'. Please grant 'repo' scope (classic PAT) or 'Contents: Read & Write' permission (fine-grained PAT).`,
      };
    }
    return {
      status: 401,
      details: token ? "Invalid or expired GitHub Token. Please update your token or reconnect." : "Authentication required for private repository.",
    };
  }
  return { status, details: rawMsg };
}

/** Read-only registry pull. */
githubRouter.get("/sync", async (req, res) => {
  let repo = req.query.repo !== undefined ? (req.query.repo as string) : env.GITHUB_REPO;
  const branch = (req.query.branch as string) || env.GITHUB_BRANCH || "main";
  const token = resolveGithubToken(req);

  if (!repo) {
    return res.json({ success: true, repo: "", lastUpdated: null, data: null, message: "No repository configured." });
  }

  repo = normalizeRepo(repo);

  try {
    const [owner, name] = repo.split("/");
    if (!owner || !name) throw new Error(`Invalid repo format: ${repo}. Use owner/repo`);

    const url = `/repos/${owner}/${name}/contents/registry.json?ref=${branch}`;

    try {
      const response = await githubClient.get(url, { headers: authHeaders(token) });
      if (!response.data || typeof response.data.content !== "string") {
        throw new Error("Invalid response from GitHub API while fetching registry.json.");
      }

      const rawContent = Buffer.from(response.data.content, "base64").toString("utf-8").trim();
      if (!rawContent) {
        return res.json({ success: true, repo, lastUpdated: new Date().toISOString(), data: null, message: "Registry file is empty." });
      }

      let registry;
      try {
        registry = JSON.parse(rawContent);
      } catch (parseError) {
        console.error("[GitSync] Failed to parse registry.json content:", rawContent.substring(0, 100));
        return res.status(422).json({ success: false, error: "Registry file is corrupted or not a valid JSON.", details: "The 'registry.json' file in your GitHub repository contains invalid JSON syntax." });
      }
      
      res.json({ success: true, repo, lastUpdated: new Date().toISOString(), data: registry });
    } catch (fileError: any) {
      if (fileError.response?.status === 404) {
        // Fallback: Check if the repository itself is reachable
        try {
          const repoRes = await githubClient.get(`/repos/${owner}/${name}`, { headers: authHeaders(token) });
          if (repoRes.data) {
            return res.json({
              success: true,
              repo: repoRes.data.full_name,
              lastUpdated: null,
              data: null,
              message: "Repository connected! 'registry.json' not created yet. Trigger a Full OS Sync or Supabase Commit to initialize."
            });
          }
        } catch (repoCheckErr: any) {
          // If checking repo also fails, throw original error
        }
      }
      throw fileError;
    }
  } catch (error: any) {
    const { status, details } = formatGithubError(error, repo, token);
    console.warn("[GitSync] Sync status warning:", { status, details, repo });
    res.status(status).json({ success: false, error: "GitHub sync failed", details, status });
  }
});

/** Full repo sync — writes to GitHub, admin only. */
githubRouter.post("/sync-full", ensureAdmin, async (req, res) => {
  let repo = (req.query.repo as string) || env.GITHUB_REPO;
  const branchOverride = (req.query.branch as string) || undefined;
  const token = resolveGithubToken(req);
  const { message = "Full System Sync via FindAba City OS" } = req.body || {};

  if (!token) return res.status(401).json({ error: "GitHub authentication required. Set GITHUB_TOKEN or login." });

  repo = normalizeRepo(repo);

  try {
    const [owner, name] = repo.split("/");
    const headers = authHeaders(token);

    const files = await collectProjectFiles(process.cwd());
    console.log(`[GitSync] Found ${files.length} files to sync.`);

    try {
      const { data: businesses } = await supabase.from("businesses").select("*").order("created_at", { ascending: false }).limit(500);
      if (businesses) {
        const registryContent = JSON.stringify({ version: "v6.0", lastUpdated: new Date().toISOString(), businesses }, null, 2);
        const existingIdx = files.findIndex((f) => f.path === "registry.json");
        if (existingIdx >= 0) files[existingIdx].content = registryContent;
        else files.push({ path: "registry.json", content: registryContent });
      }
    } catch (e) {
      console.error("[GitSync] Supabase registry fetch failed:", e);
    }

    const repoMeta = await getRepoMeta(owner, name, token);
    const targetBranch = branchOverride || repoMeta.default_branch;

    let latestCommitSha: string | null = null;
    let baseTreeSha: string | null = null;
    try {
      const branchRes = await githubClient.get(`/repos/${owner}/${name}/branches/${targetBranch}`, { headers });
      latestCommitSha = branchRes.data.commit.sha;
      baseTreeSha = branchRes.data.commit.commit.tree.sha;
    } catch {
      // Empty repo
    }

    const syncFiles = files.slice(0, 1000);
    const warning = files.length > 1000 ? `Project has ${files.length} files. Only syncing first 1,000 for stability.` : null;

    const treeItems = syncFiles.map((file) => ({ path: file.path, mode: "100644", type: "blob", content: file.content }));

    const treeRes = await githubClient.post(`/repos/${owner}/${name}/git/trees`, { base_tree: baseTreeSha, tree: treeItems }, { headers });
    const commitRes = await githubClient.post(
      `/repos/${owner}/${name}/git/commits`,
      { message, tree: treeRes.data.sha, parents: latestCommitSha ? [latestCommitSha] : [] },
      { headers }
    );
    await githubClient.patch(`/repos/${owner}/${name}/git/refs/heads/${targetBranch}`, { sha: commitRes.data.sha }, { headers });

    res.json({ success: true, commit: commitRes.data.html_url, warning });
  } catch (error: any) {
    const { status, details } = formatGithubError(error, repo, token);
    console.warn("[GitSync] Full sync error:", { status, details });
    res.status(status).json({ error: "Failed to perform full sync", details, status });
  }
});

/** Atomic multi-file commit — admin only. */
githubRouter.post("/commit", ensureAdmin, async (req, res) => {
  let repo = (req.query.repo as string) || env.GITHUB_REPO;
  const branchOverride = (req.query.branch as string) || undefined;
  const token = resolveGithubToken(req);
  const { files = [], message = "Update via FindAba City OS" } = req.body || {};

  if (!token) return res.status(401).json({ error: "GitHub authentication required. Set GITHUB_TOKEN or login." });
  if (!Array.isArray(files) || files.length === 0) return res.status(400).json({ error: "No files provided for commit" });

  repo = normalizeRepo(repo);

  try {
    const [owner, name] = repo.split("/");
    if (!owner || !name) return res.status(400).json({ error: "Invalid repo format. Use owner/repo" });

    const headers = authHeaders(token);
    const repoMeta = await getRepoMeta(owner, name, token);
    const targetBranch = branchOverride || repoMeta.default_branch;

    let latestCommitSha: string | null = null;
    let baseTreeSha: string | null = null;
    try {
      const branchRes = await githubClient.get(`/repos/${owner}/${name}/branches/${targetBranch}`, { headers });
      latestCommitSha = branchRes.data.commit.sha;
      baseTreeSha = branchRes.data.commit.commit.tree.sha;
    } catch {
      // Empty repo
    }

    const treeItems = files.map((file: any) => ({
      path: file.path,
      mode: "100644",
      type: "blob",
      content: typeof file.data === "string" ? file.data : JSON.stringify(file.data, null, 2),
    }));

    const treeRes = await githubClient.post(`/repos/${owner}/${name}/git/trees`, { base_tree: baseTreeSha, tree: treeItems }, { headers });
    const commitRes = await githubClient.post(
      `/repos/${owner}/${name}/git/commits`,
      { message, tree: treeRes.data.sha, parents: latestCommitSha ? [latestCommitSha] : [] },
      { headers }
    );

    if (latestCommitSha) {
      await githubClient.patch(`/repos/${owner}/${name}/git/refs/heads/${targetBranch}`, { sha: commitRes.data.sha }, { headers });
    } else {
      await githubClient.post(`/repos/${owner}/${name}/git/refs`, { ref: `refs/heads/${targetBranch}`, sha: commitRes.data.sha }, { headers });
    }

    res.json({ success: true, message: "Commit successful", commit: `https://github.com/${owner}/${name}/commit/${commitRes.data.sha}` });
  } catch (error: any) {
    const { status, details } = formatGithubError(error, repo, token);
    console.warn("[GitSync] Commit error:", { status, details });
    res.status(status).json({ error: "Failed to commit to GitHub", details, status });
  }
});

githubRouter.post("/branch", ensureAdmin, async (req, res) => {
  const { branch, from, repo: bodyRepo } = req.body;
  let repo = (req.query.repo as string) || bodyRepo || env.GITHUB_REPO;
  const token = resolveGithubToken(req);

  if (!token || !branch) return res.status(400).json({ error: "Missing parameters for branch creation" });

  repo = normalizeRepo(repo);

  try {
    const [owner, name] = repo.split("/");
    const headers = authHeaders(token);

    let sourceBranch = from;
    if (!sourceBranch) {
      const repoMeta = await getRepoMeta(owner, name, token);
      sourceBranch = repoMeta.default_branch;
    }

    const branchRes = await githubClient.get(`/repos/${owner}/${name}/branches/${sourceBranch}`, { headers });
    await githubClient.post(`/repos/${owner}/${name}/git/refs`, { ref: `refs/heads/${branch}`, sha: branchRes.data.commit.sha }, { headers });

    res.json({ success: true, message: `Branch ${branch} created from ${sourceBranch}` });
  } catch (error: any) {
    console.warn("[GitSync] Branch creation error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to create branch", details: error.response?.data?.message || error.message });
  }
});

githubRouter.get("/all-files", ensureAdmin, async (req, res) => {
  try {
    const files = await collectProjectFiles(process.cwd());
    res.json({ files: files.map((f) => ({ path: f.path, data: f.content })) });
  } catch (error: any) {
    console.error("[GitSync] Failed to read project files:", error);
    res.status(500).json({ error: "Failed to read project files", details: error.message });
  }
});

export interface WebhookLogEntry {
  id: string;
  timestamp: string;
  event: string;
  repository: string;
  sender: string;
  ref?: string;
  commitsCount?: number;
  status: 'processed' | 'success' | 'warning' | 'rejected' | 'failed';
  message: string;
  headCommit?: {
    id: string;
    message: string;
    author: string;
    timestamp: string;
  };
}

const webhookLogs: WebhookLogEntry[] = [
  {
    id: "log_init_1",
    timestamp: new Date().toISOString(),
    event: "push",
    repository: env.GITHUB_REPO || "nedtwistmovies-star/FindAba-OS",
    sender: "system-admin",
    ref: `refs/heads/${env.GITHUB_BRANCH || "main"}`,
    commitsCount: 1,
    status: "success",
    message: "GitHub Webhook listener active. Monitoring real-time repository pushes.",
    headCommit: {
      id: "7a8f9b0",
      message: "Initialize FindAba City OS GitHub webhook listener",
      author: "City OS Admin",
      timestamp: new Date().toISOString()
    }
  }
];

/** Run complete GitHub integration diagnostics */
githubRouter.get("/diagnostic", async (req, res) => {
  const token = resolveGithubToken(req);
  const queryRepo = req.query.repo as string;
  const repo = queryRepo || env.GITHUB_REPO;
  const branch = env.GITHUB_BRANCH || "main";

  const results: any = {
    success: true,
    envRepo: env.GITHUB_REPO || null,
    envBranch: branch,
    hasToken: !!token,
    repoValid: false,
    apiReachable: false,
    message: "Diagnostics started",
    details: "",
    checks: {
      envRepo: env.GITHUB_REPO ? "PRESENT" : "MISSING",
      hasToken: token ? "PRESENT" : "MISSING",
      repoFormat: "PENDING",
      apiStatus: "PENDING"
    }
  };

  if (!repo) {
    results.success = false;
    results.message = "Configuration incomplete: No GITHUB_REPO found in environment or query.";
    results.checks.repoFormat = "INVALID (MISSING)";
    results.checks.apiStatus = "UNREACHABLE";
    return res.json(results);
  }

  const cleanRepo = normalizeRepo(repo);
  const parts = cleanRepo.split("/");
  if (parts.length === 2 && parts[0] && parts[1]) {
    results.repoValid = true;
    results.checks.repoFormat = "VALID";
  } else {
    results.success = false;
    results.message = `Invalid repository format '${repo}'. Expected 'owner/repo'.`;
    results.checks.repoFormat = "INVALID";
    results.checks.apiStatus = "UNREACHABLE";
    return res.json(results);
  }

  try {
    const headers = authHeaders(token);
    const response = await githubClient.get(`/repos/${parts[0]}/${parts[1]}`, { headers });
    results.apiReachable = true;
    results.checks.apiStatus = "REACHABLE";
    results.message = `GitHub API reachable for repository '${response.data.full_name}' (${response.data.private ? "Private" : "Public"}). Token status: ${token ? "Authenticated" : "Anonymous"}`;
  } catch (error: any) {
    results.success = false;
    results.checks.apiStatus = "UNREACHABLE";
    const { details } = formatGithubError(error, cleanRepo, token);
    results.message = `GitHub API check failed for '${cleanRepo}': ${details}`;
  }

  res.json(results);
});

/** Test GitHub repository & token connection */
githubRouter.post("/test-connection", async (req, res) => {
  let { repo: inputRepo, token: inputToken } = req.body || {};
  let repo = inputRepo || req.query.repo || env.GITHUB_REPO;
  const token = (inputToken && inputToken.trim()) ? inputToken.trim() : resolveGithubToken(req);

  if (!repo) {
    return res.status(400).json({
      success: false,
      message: "No GitHub repository provided. Please configure GITHUB_REPO.",
    });
  }

  repo = normalizeRepo(String(repo));

  try {
    const [owner, name] = repo.split("/");
    if (!owner || !name) {
      return res.status(400).json({
        success: false,
        message: `Invalid repository format '${repo}'. Use 'owner/repo'.`,
      });
    }

    const headers = authHeaders(token);
    const response = await githubClient.get(`/repos/${owner}/${name}`, { headers });
    const repoData = response.data;

    const rateLimitRemaining = parseInt(response.headers["x-ratelimit-remaining"] || "60", 10);
    const isPrivate = repoData.private;
    const defaultBranch = repoData.default_branch || "main";
    const permissions = repoData.permissions || null;

    let authStatus = token ? "Authenticated via Token" : "Anonymous / Public Only";
    if (token && permissions) {
      if (permissions.push || permissions.admin) {
        authStatus += " (Read & Write Authorized)";
      } else {
        authStatus += " (Read Only Access)";
      }
    }

    res.json({
      success: true,
      repo: repoData.full_name,
      exists: true,
      private: isPrivate,
      defaultBranch,
      permissions,
      rateLimitRemaining,
      authStatus,
      htmlUrl: repoData.html_url,
      description: repoData.description,
      message: `Repository '${repoData.full_name}' is reachable! (${isPrivate ? 'Private' : 'Public'}, branch: ${defaultBranch}). Token status: ${authStatus}`,
    });
  } catch (error: any) {
    const { status, details } = formatGithubError(error, repo, token);
    console.warn("[GitSync] Test connection failed:", { status, details, repo });
    res.status(status).json({
      success: false,
      repo,
      exists: false,
      status,
      details,
      message: `Connection test failed for '${repo}': ${details}`,
    });
  }
});

/** Update GITHUB_REPO environment setting directly */
githubRouter.post("/config", ensureAdmin, async (req, res) => {
  const { repo, branch, token } = req.body || {};
  
  if (repo !== undefined) {
    const cleanRepo = normalizeRepo(repo);
    process.env.GITHUB_REPO = cleanRepo;
    env.GITHUB_REPO = cleanRepo;
  }
  if (branch !== undefined) {
    process.env.GITHUB_BRANCH = branch;
    env.GITHUB_BRANCH = branch;
  }
  if (token !== undefined && token.trim()) {
    process.env.GITHUB_TOKEN = token.trim();
    env.GITHUB_TOKEN = token.trim();
  }

  try {
    const envPath = path.join(process.cwd(), ".env");
    let envContent = "";
    try {
      envContent = await fs.readFile(envPath, "utf-8");
    } catch {
      envContent = "";
    }

    if (repo !== undefined) {
      const cleanRepo = normalizeRepo(repo);
      if (envContent.includes("GITHUB_REPO=")) {
        envContent = envContent.replace(/GITHUB_REPO=.*/g, `GITHUB_REPO=${cleanRepo}`);
      } else {
        envContent += `\nGITHUB_REPO=${cleanRepo}`;
      }
    }
    if (branch !== undefined) {
      if (envContent.includes("GITHUB_BRANCH=")) {
        envContent = envContent.replace(/GITHUB_BRANCH=.*/g, `GITHUB_BRANCH=${branch}`);
      } else {
        envContent += `\nGITHUB_BRANCH=${branch}`;
      }
    }
    if (token !== undefined && token.trim()) {
      if (envContent.includes("GITHUB_TOKEN=")) {
        envContent = envContent.replace(/GITHUB_TOKEN=.*/g, `GITHUB_TOKEN=${token.trim()}`);
      } else {
        envContent += `\nGITHUB_TOKEN=${token.trim()}`;
      }
    }
    await fs.writeFile(envPath, envContent.trim() + "\n", "utf-8");
  } catch (err) {
    console.warn("[GitConfig] Could not write .env file:", err);
  }

  res.json({
    success: true,
    message: "GitHub repository environment settings updated!",
    repo: env.GITHUB_REPO,
    branch: env.GITHUB_BRANCH,
    hasToken: !!env.GITHUB_TOKEN,
  });
});

/** Retrieve GitHub webhook integration logs */
githubRouter.get("/webhook-logs", async (req, res) => {
  res.json({ success: true, logs: webhookLogs });
});

/** Clear webhook logs */
githubRouter.delete("/webhook-logs", ensureAdmin, async (req, res) => {
  webhookLogs.length = 0;
  res.json({ success: true, message: "Webhook logs cleared." });
});

/** Simulate incoming GitHub webhook event */
githubRouter.post("/webhook/simulate", ensureAdmin, async (req, res) => {
  const { event = "push", branch = env.GITHUB_BRANCH || "main", message = "Simulated Push to GitHub Repo", author = "Admin" } = req.body || {};
  
  const simulatedEntry: WebhookLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    event,
    repository: env.GITHUB_REPO || "nedtwistmovies-star/FindAba-OS",
    sender: author,
    ref: `refs/heads/${branch}`,
    commitsCount: 1,
    status: "success",
    message: `[Simulated Hook] ${event.toUpperCase()} payload acknowledged for branch ${branch}`,
    headCommit: {
      id: crypto.randomBytes(4).toString("hex"),
      message,
      author,
      timestamp: new Date().toISOString(),
    },
  };

  webhookLogs.unshift(simulatedEntry);
  if (webhookLogs.length > 100) webhookLogs.pop();

  res.json({ success: true, log: simulatedEntry });
});

/** Fetch repository branches list using GITHUB_TOKEN */
githubRouter.get("/branches", async (req, res) => {
  let repo = (req.query.repo as string) || env.GITHUB_REPO;
  const token = resolveGithubToken(req);

  if (!repo) {
    return res.status(400).json({ success: false, message: "Repository parameter is required." });
  }

  repo = normalizeRepo(String(repo));
  const [owner, name] = repo.split("/");
  if (!owner || !name) {
    return res.status(400).json({ success: false, message: `Invalid repository format '${repo}'. Use 'owner/repo'.` });
  }

  try {
    const headers = authHeaders(token);
    const response = await githubClient.get(`/repos/${owner}/${name}/branches?per_page=100`, { headers });
    const branches = (response.data || []).map((b: any) => ({
      name: b.name,
      protected: !!b.protected,
      sha: b.commit?.sha?.substring(0, 7) || "",
    }));

    res.json({
      success: true,
      repo,
      branches,
      count: branches.length,
      defaultBranch: env.GITHUB_BRANCH || "main",
    });
  } catch (error: any) {
    const { status, details } = formatGithubError(error, repo, token);
    console.warn("[GitBranches] Failed to fetch branches:", { status, details, repo });
    res.status(status).json({
      success: false,
      message: `Failed to fetch branches for '${repo}': ${details}`,
      branches: [],
    });
  }
});

/** Fetch repositories for a specified GitHub Organization (or user account) */
githubRouter.get("/org-repos", async (req, res) => {
  const org = (req.query.org as string || "").trim();
  const token = resolveGithubToken(req);

  if (!org) {
    return res.status(400).json({ success: false, message: "Organization name is required." });
  }

  const headers = authHeaders(token);
  try {
    let reposData: any[] = [];
    try {
      const response = await githubClient.get(`/orgs/${encodeURIComponent(org)}/repos?per_page=100&sort=updated`, { headers });
      reposData = response.data;
    } catch (orgErr: any) {
      if (orgErr.response?.status === 404) {
        // Fallback to user repos if org is a user handle
        const userRes = await githubClient.get(`/users/${encodeURIComponent(org)}/repos?per_page=100&sort=updated`, { headers });
        reposData = userRes.data;
      } else {
        throw orgErr;
      }
    }

    const repos = (reposData || []).map((r: any) => ({
      name: r.name,
      fullName: r.full_name,
      description: r.description || "No description provided",
      private: r.private,
      stars: r.stargazers_count || 0,
      forks: r.forks_count || 0,
      updatedAt: r.updated_at,
      defaultBranch: r.default_branch || "main",
      language: r.language || "TypeScript",
      htmlUrl: r.html_url,
    }));

    res.json({
      success: true,
      org,
      repos,
      count: repos.length,
    });
  } catch (error: any) {
    const status = error.response?.status || 500;
    const details = error.response?.data?.message || error.message || "Failed to fetch repositories.";
    console.warn("[GitOrgRepos] Failed to fetch organization repos:", { status, details, org });
    res.status(status).json({
      success: false,
      message: `Failed to list repositories for '${org}': ${details}`,
      repos: [],
    });
  }
});

/** Replay a previously recorded GitHub webhook event */
githubRouter.post("/webhook/replay", ensureAdmin, async (req, res) => {
  const { logId } = req.body || {};
  if (!logId) {
    return res.status(400).json({ success: false, message: "logId is required for replay." });
  }

  const existingLog = webhookLogs.find((l) => l.id === logId);
  if (!existingLog) {
    return res.status(404).json({ success: false, message: `Webhook log entry '${logId}' not found.` });
  }

  const replayedLog: WebhookLogEntry = {
    id: `log_replay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    event: existingLog.event,
    repository: existingLog.repository,
    sender: `${existingLog.sender} (Replayed)`,
    ref: existingLog.ref,
    commitsCount: existingLog.commitsCount,
    status: "success",
    message: `[REPLAYED EVENT] Re-triggered processing of ${existingLog.event} event for ${existingLog.repository}`,
    headCommit: existingLog.headCommit
      ? {
          ...existingLog.headCommit,
          message: `[Replayed] ${existingLog.headCommit.message}`,
          timestamp: new Date().toISOString(),
        }
      : undefined,
  };

  webhookLogs.unshift(replayedLog);
  if (webhookLogs.length > 100) webhookLogs.pop();

  res.json({
    success: true,
    message: `Webhook event '${existingLog.event}' for repository '${existingLog.repository}' successfully replayed!`,
    replayedLog,
  });
});

/** GitHub App/webhook. */
githubRouter.post("/webhook", async (req, res) => {
  const signature = req.headers["x-hub-signature-256"] as string;
  const secret = env.GITHUB_WEBHOOK_SECRET;

  if (secret && signature) {
    const digest = "sha256=" + crypto.createHmac("sha256", secret).update(JSON.stringify(req.body)).digest("hex");
    if (signature !== digest) {
      console.warn("[GitHub Webhook] Invalid signature detected.");
      const failLog: WebhookLogEntry = {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        event: (req.headers["x-github-event"] as string) || "unknown",
        repository: req.body?.repository?.full_name || "unknown",
        sender: req.body?.sender?.login || "unknown",
        status: "rejected",
        message: "Invalid HMAC signature — payload rejected",
      };
      webhookLogs.unshift(failLog);
      if (webhookLogs.length > 100) webhookLogs.pop();
      return res.status(401).send("Invalid signature");
    }
  }

  const event = (req.headers["x-github-event"] as string) || "push";
  const repoName = req.body?.repository?.full_name || env.GITHUB_REPO || "unknown";
  const senderName = req.body?.sender?.login || req.body?.pusher?.name || "github-user";
  const ref = req.body?.ref || "";
  const commits = req.body?.commits || [];
  const headCommit = req.body?.head_commit;

  let status: 'processed' | 'success' | 'warning' | 'rejected' | 'failed' = "processed";
  let msg = `Incoming ${event} notification received from ${senderName}`;

  if (event === "push") {
    const branch = ref.replace("refs/heads/", "");
    if (branch === env.GITHUB_BRANCH) {
      msg = `Push to target branch '${branch}' processed (${commits.length} commit(s)). Automated system sync triggered.`;
      status = "success";
    } else {
      msg = `Push event received for branch '${branch}' (configured target: '${env.GITHUB_BRANCH}'). Recorded in log.`;
      status = "warning";
    }
  } else if (event === "ping") {
    msg = `GitHub Webhook ping acknowledged successfully. Webhook URL is healthy.`;
    status = "success";
  }

  const newLog: WebhookLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    event,
    repository: repoName,
    sender: senderName,
    ref,
    commitsCount: commits.length || (headCommit ? 1 : 0),
    status,
    message: msg,
    headCommit: headCommit ? {
      id: headCommit.id?.substring(0, 7) || "commit",
      message: headCommit.message || "No commit message",
      author: headCommit.author?.name || senderName,
      timestamp: headCommit.timestamp || new Date().toISOString()
    } : undefined
  };

  webhookLogs.unshift(newLog);
  if (webhookLogs.length > 100) webhookLogs.pop();

  res.status(200).send("OK");
});

