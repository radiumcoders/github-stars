import { auditPermissionSnapshot, EXPECTED_POLICY } from "./github-permissions";

export type EnvironmentMode = "development" | "production";

export type EnvironmentCheck = {
  ok: boolean;
  issues: string[];
  warnings: string[];
  limitation: string;
  mode: EnvironmentMode | "invalid";
};

export type AuthRuntimeConfig = {
  mode: EnvironmentMode;
  canonicalOrigin: string;
  betterAuthSecret: string;
  databaseUrl: string;
  githubClientId: string;
  githubClientSecret: string;
};

export type GithubAppConfig = AuthRuntimeConfig & {
  githubAppId: number;
  githubAppSlug: string;
  policy: typeof EXPECTED_POLICY;
};

const AUTH_REQUIRED_KEYS = [
  "BETTER_AUTH_SECRET",
  "DATABASE_URL",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
] as const;

const APP_REQUIRED_KEYS = ["GITHUB_APP_ID", "GITHUB_APP_SLUG"] as const;

const PUBLIC_SECRET_NAME =
  /^NEXT_PUBLIC_.*(SECRET|TOKEN|PASSWORD|DATABASE|PRIVATE_KEY|PRIVATE)/i;

const LIMITATION =
  "Shape check only; does not verify credentials, database connectivity, or GitHub App registration.";

const DEV_DEFAULT_ORIGIN = "http://localhost:3000";

type EnvMap = Record<string, string | undefined>;

export type EnvironmentCheckOptions = {
  requireGithubApp?: boolean;
};

function read(env: EnvMap, key: string): string {
  return typeof env[key] === "string" ? env[key].trim() : "";
}

function originFrom(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function looksLikePlaceholder(value: string): boolean {
  return /^(YOUR_|CHANGE_ME|TODO|REPLACE|PLACEHOLDER)/i.test(value);
}

function normalizeAppSlug(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  try {
    const url = new URL(value);
    const match = url.pathname.match(/^\/apps\/([a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?)\/?$/i);
    if ((url.hostname === "github.com" || url.hostname === "www.github.com") && match) {
      return match[1];
    }
  } catch {
    // Keep the raw slug when this is not a URL.
  }
  return value;
}

function readSlug(env: EnvMap): string {
  return normalizeAppSlug(read(env, "GITHUB_APP_SLUG"));
}

function originsEquivalent(left: URL, right: URL, mode: string): boolean {
  if (left.origin === right.origin) return true;
  if (mode !== "development") return false;
  return (
    left.protocol === right.protocol &&
    left.port === right.port &&
    isLocalHost(left.hostname) &&
    isLocalHost(right.hostname)
  );
}

export function detectMode(env: EnvMap = process.env): EnvironmentMode | "invalid" {
  const explicit = read(env, "GITHUB_STARS_ENV") || read(env, "APP_ENV");
  if (explicit === "production" || explicit === "development") return explicit;
  if (explicit) return "invalid";
  if (read(env, "VERCEL_ENV") === "production" || read(env, "NODE_ENV") === "production") {
    return "production";
  }
  return "development";
}

function collectOriginIssues(
  env: EnvMap,
  mode: EnvironmentMode,
): { issues: string[]; origin: URL | null } {
  const issues: string[] = [];
  const authUrl = originFrom(read(env, "BETTER_AUTH_URL"));
  const publicUrl = originFrom(read(env, "NEXT_PUBLIC_BASE_URL"));
  const originIssues = (label: string, url: URL | null, raw: string) => {
    if (!raw) return;
    if (!url) {
      issues.push(`${label} is not a valid URL.`);
      return;
    }
    if (url.username || url.password) {
      issues.push(`${label} must not include credentials.`);
    }
    if (url.search || url.hash) {
      issues.push(`${label} must not include a query or fragment.`);
    }
    if (url.pathname && url.pathname !== "/") {
      issues.push(`${label} must be an origin, not a path.`);
    }
  };
  originIssues("BETTER_AUTH_URL", authUrl, read(env, "BETTER_AUTH_URL"));
  originIssues("NEXT_PUBLIC_BASE_URL", publicUrl, read(env, "NEXT_PUBLIC_BASE_URL"));

  if (!read(env, "BETTER_AUTH_URL") && !read(env, "NEXT_PUBLIC_BASE_URL") && mode !== "development") {
    issues.push("BETTER_AUTH_URL or NEXT_PUBLIC_BASE_URL is required.");
  }

  if (authUrl && publicUrl && !originsEquivalent(authUrl, publicUrl, mode)) {
    issues.push("BETTER_AUTH_URL and NEXT_PUBLIC_BASE_URL must be the same origin.");
  }

  const origin = authUrl ?? publicUrl ?? (mode === "development" ? originFrom(DEV_DEFAULT_ORIGIN) : null);
  if (origin) {
    if (mode === "development" && !isLocalHost(origin.hostname)) {
      issues.push("Development origins must be localhost or 127.0.0.1.");
    }
    if (mode === "production") {
      if (origin.protocol !== "https:") {
        issues.push("Production origins must use HTTPS.");
      }
      if (isLocalHost(origin.hostname)) {
        issues.push("Production origins must not use localhost.");
      }
    }
  }

  return { issues, origin };
}

export function checkEnvironment(
  env: EnvMap,
  mode: string = "development",
  options: EnvironmentCheckOptions = {},
): EnvironmentCheck {
  const issues: string[] = [];
  const warnings: string[] = [];
  const requireGithubApp = options.requireGithubApp !== false;

  if (mode !== "development" && mode !== "production") {
    return {
      ok: false,
      issues: ["Unknown environment mode."],
      warnings,
      limitation: LIMITATION,
      mode: "invalid",
    };
  }

  for (const key of Object.keys(env)) {
    if (PUBLIC_SECRET_NAME.test(key) && read(env, key)) {
      issues.push(`${key} must not expose a secret to the browser.`);
    }
  }

  for (const key of AUTH_REQUIRED_KEYS) {
    if (!read(env, key)) {
      issues.push(`${key} is required.`);
    }
  }
  if (requireGithubApp) {
    for (const key of APP_REQUIRED_KEYS) {
      if (!read(env, key)) {
        issues.push(`${key} is required.`);
      }
    }
  }

  const secret = read(env, "BETTER_AUTH_SECRET");
  if (secret && (secret.length < 32 || looksLikePlaceholder(secret))) {
    issues.push("BETTER_AUTH_SECRET is too short or looks like a placeholder.");
  }

  const appIdRaw = read(env, "GITHUB_APP_ID");
  if (appIdRaw) {
    if (!/^\d+$/.test(appIdRaw)) {
      issues.push("GITHUB_APP_ID must be the numeric App ID, not a Client ID.");
    } else {
      const appId = Number(appIdRaw);
      if (!Number.isSafeInteger(appId) || appId < 1) {
        issues.push("GITHUB_APP_ID must be a positive integer.");
      }
    }
  }

  const slug = readSlug(env);
  if (slug && !/^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/i.test(slug)) {
    issues.push("GITHUB_APP_SLUG must be the App slug, not a URL.");
  }

  const clientSecret = read(env, "GITHUB_CLIENT_SECRET");
  if (clientSecret && (clientSecret.length < 8 || looksLikePlaceholder(clientSecret))) {
    issues.push("GITHUB_CLIENT_SECRET looks like a placeholder.");
  }

  const originCheck = collectOriginIssues(env, mode);
  issues.push(...originCheck.issues);

  const databaseUrl = read(env, "DATABASE_URL");
  if (databaseUrl) {
    let db: URL | null = null;
    try {
      db = new URL(databaseUrl);
    } catch {
      issues.push("DATABASE_URL is not a valid URL.");
    }
    if (db) {
      if (!/^postgres(ql)?:$/i.test(db.protocol)) {
        issues.push("DATABASE_URL must be a Postgres connection string.");
      }
      const sslMode = db.searchParams.get("sslmode")?.toLowerCase();
      if (sslMode === "disable" || sslMode === "allow" || sslMode === "prefer") {
        issues.push("DATABASE_URL must not disable TLS.");
      } else if (mode === "production" && sslMode !== "require" && sslMode !== "verify-full") {
        warnings.push("Production DATABASE_URL should include a setting that enforces TLS.");
      }
    }
  }

  if (read(env, "LEGACY_GITHUB_CLIENT_SECRET") || read(env, "LEGACY_GITHUB_CLIENT_ID")) {
    warnings.push(
      "Legacy GitHub OAuth credentials are present. Load them only in the authorized retirement runner.",
    );
  }
  if (read(env, "GITHUB_APP_PRIVATE_KEY") || read(env, "GITHUB_PRIVATE_KEY")) {
    warnings.push(
      "A GitHub App private key is present, but this design uses user access tokens and does not need a PEM.",
    );
  }

  const policy = auditPermissionSnapshot(EXPECTED_POLICY);
  if (!policy.ok) {
    issues.push("Built-in permission policy is invalid.");
  }

  return {
    ok: issues.length === 0,
    issues,
    warnings,
    limitation: LIMITATION,
    mode,
  };
}

function authConfigFromEnv(
  env: EnvMap,
  mode: EnvironmentMode,
): AuthRuntimeConfig {
  const authUrl = originFrom(read(env, "BETTER_AUTH_URL"));
  const publicUrl = originFrom(read(env, "NEXT_PUBLIC_BASE_URL"));
  const origin = authUrl ?? publicUrl ?? new URL(DEV_DEFAULT_ORIGIN);
  return {
    mode,
    canonicalOrigin: origin.origin,
    betterAuthSecret: read(env, "BETTER_AUTH_SECRET"),
    databaseUrl: read(env, "DATABASE_URL"),
    githubClientId: read(env, "GITHUB_CLIENT_ID"),
    githubClientSecret: read(env, "GITHUB_CLIENT_SECRET"),
  };
}

export function tryLoadAuthConfig(
  env: EnvMap = process.env,
  mode: EnvironmentMode | string = detectMode(env),
): { ok: true; config: AuthRuntimeConfig } | { ok: false; check: EnvironmentCheck } {
  const check = checkEnvironment(env, mode, { requireGithubApp: false });
  if (!check.ok || (mode !== "development" && mode !== "production")) {
    return { ok: false, check };
  }
  return { ok: true, config: authConfigFromEnv(env, mode) };
}

export function tryLoadGithubAppConfig(
  env: EnvMap = process.env,
  mode: EnvironmentMode | string = detectMode(env),
): { ok: true; config: GithubAppConfig } | { ok: false; check: EnvironmentCheck } {
  const check = checkEnvironment(env, mode);
  if (!check.ok || (mode !== "development" && mode !== "production")) {
    return { ok: false, check };
  }
  return {
    ok: true,
    config: {
      ...authConfigFromEnv(env, mode),
      githubAppId: Number(read(env, "GITHUB_APP_ID")),
      githubAppSlug: readSlug(env),
      policy: EXPECTED_POLICY,
    },
  };
}

export function buildTrustedOrigins(
  canonicalOrigin: string,
  env: EnvMap = process.env,
): string[] {
  const origins = new Set<string>();
  const add = (value: string) => {
    const url = originFrom(value);
    if (url) origins.add(url.origin);
  };

  add(canonicalOrigin);
  add(read(env, "BETTER_AUTH_URL"));
  add(read(env, "NEXT_PUBLIC_BASE_URL"));
  const vercel = read(env, "VERCEL_URL");
  if (vercel) add(`https://${vercel}`);

  const parsed = originFrom(canonicalOrigin);
  if (parsed && isLocalHost(parsed.hostname)) {
    const ports = new Set<string>([parsed.port || "", "3000", "3001"]);
    for (const host of ["localhost", "127.0.0.1"]) {
      for (const port of ports) {
        add(`${parsed.protocol}//${host}${port ? `:${port}` : ""}`);
      }
    }
  }

  return [...origins];
}

export function githubInstallUrl(slug: string, state?: string): string {
  const url = new URL(`https://github.com/apps/${slug}/installations/new`);
  if (state) url.searchParams.set("state", state);
  return url.toString();
}

export function githubManageInstallUrl(installationId: number): string {
  return `https://github.com/settings/installations/${installationId}`;
}
