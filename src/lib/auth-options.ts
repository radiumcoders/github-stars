import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { getAuthDatabase } from "@/lib/auth-db";
import {
  buildTrustedOrigins,
  type AuthRuntimeConfig,
} from "@/lib/github-app-config";
import {
  BLOCKED_TOKEN_PATHS,
  GITHUB_SOCIAL_PROVIDER,
} from "@/lib/auth-paths";
import { isForbiddenOAuthScope } from "@/lib/github-permissions";

function rejectScopeEscalation(body: unknown) {
  if (!body || typeof body !== "object") return;
  const record = body as { scope?: unknown; scopes?: unknown };
  const scopes = record.scopes ?? record.scope;
  const list = Array.isArray(scopes)
    ? scopes
    : typeof scopes === "string"
      ? scopes.split(/[,\s]+/).filter(Boolean)
      : [];
  const allowed = new Set<string>(GITHUB_SOCIAL_PROVIDER.scope);
  if (list.some((scope) => typeof scope === "string" && (isForbiddenOAuthScope(scope) || !allowed.has(scope)))) {
    throw new APIError("BAD_REQUEST", {
      message: "Additional GitHub OAuth scopes are not allowed.",
    });
  }
}

export function createSharedAuthOptions(
  config: AuthRuntimeConfig,
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
    trustedOrigins: buildTrustedOrigins(config.canonicalOrigin),
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
