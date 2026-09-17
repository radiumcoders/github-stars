import { checkEnvironment, detectMode, tryLoadGithubAppConfig } from "@/lib/github-app-config";

const parsed = tryLoadGithubAppConfig();

export const env = parsed.ok
  ? {
      BETTER_AUTH_SECRET: parsed.config.betterAuthSecret,
      BETTER_AUTH_URL: parsed.config.canonicalOrigin,
      DATABASE_URL: parsed.config.databaseUrl,
      GITHUB_CLIENT_ID: parsed.config.githubClientId,
      GITHUB_CLIENT_SECRET: parsed.config.githubClientSecret,
      GITHUB_APP_ID: String(parsed.config.githubAppId),
      GITHUB_APP_SLUG: parsed.config.githubAppSlug,
      NEXT_PUBLIC_BASE_URL: parsed.config.canonicalOrigin,
      mode: parsed.config.mode,
      isVercel: process.env.VERCEL === "1",
    }
  : {
      BETTER_AUTH_SECRET: undefined,
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
      DATABASE_URL: process.env.DATABASE_URL,
      GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
      GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
      GITHUB_APP_ID: process.env.GITHUB_APP_ID,
      GITHUB_APP_SLUG: process.env.GITHUB_APP_SLUG,
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
      mode: detectMode(),
      isVercel: process.env.VERCEL === "1",
      check: checkEnvironment(process.env, detectMode()),
    };
