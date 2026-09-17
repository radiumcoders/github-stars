import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { getAuthDatabase } from "@/lib/auth-db";
import type { GithubAppConfig } from "@/lib/github-app-config";
import {
  BLOCKED_TOKEN_PATHS,
  GITHUB_SOCIAL_PROVIDER,
} from "@/lib/auth-paths";

function rejectScopeEscalation(body: unknown) {
  if (!body || typeof body !== "object") return;
  const record = body as { scope?: unknown; scopes?: unknown };
  const scopes = record.scopes ?? record.scope;
  const list = Array.isArray(scopes)
    ? scopes
    : typeof scopes === "string"
      ? scopes.split(/[,\s]+/).filter(Boolean)
      : [];
  if (list.length > 0) {
    throw new APIError("BAD_REQUEST", {
      message: "Additional GitHub OAuth scopes are not allowed.",
    });
  }
}

export function createSharedAuthOptions(
  config: GithubAppConfig,
  plugins: Parameters<typeof betterAuth>[0]["plugins"] = [],
) {
  const database = getAuthDatabase();
  if (!database) {
    throw new Error("DATABASE_URL is required for authentication.");
  }

  return {
    database,
    secret: config.betterAuthSecret,
    baseURL: config.canonicalOrigin,
    trustedOrigins: [config.canonicalOrigin],
    telemetry: { enabled: false },
    disabledPaths: [...BLOCKED_TOKEN_PATHS],
    socialProviders: {
      github: {
        clientId: config.githubClientId,
        clientSecret: config.githubClientSecret,
        disableDefaultScope: GITHUB_SOCIAL_PROVIDER.disableDefaultScope,
        scope: [...GITHUB_SOCIAL_PROVIDER.scope],
      },
    },
    account: {
      encryptOAuthTokens: true,
      accountLinking: {
        enabled: true,
        trustedProviders: ["github"] as const,
        allowDifferentEmails: false,
      },
      updateAccountOnSignIn: true,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: {
        enabled: false,
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/sign-in/social" || ctx.path === "/link-social") {
          rejectScopeEscalation(ctx.body);
        }
      }),
    },
    plugins,
  } satisfies Parameters<typeof betterAuth>[0];
}

export { BLOCKED_TOKEN_PATHS, GITHUB_SOCIAL_PROVIDER, isBlockedAuthPath, githubProviderHasWriteScope } from "@/lib/auth-paths";
