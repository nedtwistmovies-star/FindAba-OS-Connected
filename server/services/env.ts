/**
 * server/services/env.ts
 *
 * Single source of truth for environment variables.
 * Required vars throw at startup (fail fast, no silent fallback secrets).
 */

function getEnv(name: string, fallbackName?: string): string | undefined {
  const val = process.env[name] || (fallbackName ? process.env[fallbackName] : undefined);
  return val && val.trim() ? val.trim() : undefined;
}

function required(name: string, fallbackName?: string): string {
  const value = getEnv(name, fallbackName);
  if (!value) {
    throw new Error(
      `[ENV] Missing required environment variable: ${name}${fallbackName ? ` (or ${fallbackName})` : ''}. ` +
        `Set it before starting the server — no fallback secret exists in code.`
    );
  }
  return value;
}

function optional(name: string, fallbackName?: string): string | undefined {
  return getEnv(name, fallbackName);
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  IS_VERCEL: !!process.env.VERCEL,
  PORT: 3000,

  // Required — nothing works without the DB
  SUPABASE_URL: required("SUPABASE_URL", "VITE_SUPABASE_URL"),
  SUPABASE_SERVICE_ROLE_KEY: required("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_KEY"),
  SUPABASE_ANON_KEY: optional("SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY"),

  // AI providers — optional at startup, validated lazily by services/ai.ts
  OPENROUTER_API_KEY: optional("OPENROUTER_API_KEY", "VITE_OPENROUTER_API_KEY"),
  GEMINI_API_KEY: optional("GEMINI_API_KEY", "VITE_GEMINI_API_KEY") || optional("API_KEY"),
  DEFAULT_AI_PROVIDER: process.env.DEFAULT_AI_PROVIDER || "openrouter",

  // GitHub
  GITHUB_TOKEN: optional("GITHUB_TOKEN"),
  GITHUB_CLIENT_ID: optional("GITHUB_CLIENT_ID"),
  GITHUB_CLIENT_SECRET: optional("GITHUB_CLIENT_SECRET"),
  GITHUB_REPO: optional("GITHUB_REPO") || "nedtwistmovies-star/FindAba-OS",
  GITHUB_BRANCH: optional("GITHUB_BRANCH") || "main",
  GITHUB_WEBHOOK_SECRET: optional("GITHUB_WEBHOOK_SECRET"),

  // Payments
  PAYSTACK_SECRET_KEY: optional("PAYSTACK_SECRET_KEY"),
  PAYSTACK_PUBLIC_KEY: optional("PAYSTACK_PUBLIC_KEY", "VITE_PAYSTACK_PUBLIC_KEY"),

  // Email
  RESEND_API_KEY: optional("RESEND_API_KEY"),

  // WhatsApp
  WHATSAPP_VERIFY_TOKEN: optional("WHATSAPP_VERIFY_TOKEN"),

  // Automation
  MAKE_WEBHOOK_URL: optional("MAKE_WEBHOOK_URL"),

  // Admin bootstrap — master admin email
  MASTER_ADMIN_EMAIL: optional("MASTER_ADMIN_EMAIL") || "pastornelsonezi@gmail.com",

  APP_URL: optional("APP_URL"),
};

/** Public-safe subset — never includes secret keys, only "is this configured" flags. */
export function publicConfig(isAdmin: boolean) {
  const base = {
    supabaseUrl: env.SUPABASE_URL,
    hasGeminiKey: !!env.GEMINI_API_KEY,
    hasOpenRouterKey: !!env.OPENROUTER_API_KEY,
    hasPaystackKey: !!env.PAYSTACK_PUBLIC_KEY,
    isAdminDetected: isAdmin,
  };

  if (!isAdmin) return base;

  return {
    ...base,
    supabaseAnonKey: env.SUPABASE_ANON_KEY || null,
    paystackPublicKey: env.PAYSTACK_PUBLIC_KEY || null,
    githubRepo: env.GITHUB_REPO,
    githubBranch: env.GITHUB_BRANCH,
  };
}
