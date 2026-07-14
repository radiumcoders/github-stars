import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { getAuthDatabase } from "@/lib/auth-db";

function buildTrustedOrigins(): string[] {
  const origins = new Set<string>([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
  ]);

  for (const raw of [
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_BASE_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ]) {
    if (!raw?.trim()) continue;
    try {
      origins.add(new URL(raw).origin);
    } catch {
      // ignore invalid env values
    }
  }

  return [...origins];
}

function createAuth() {
  const database = getAuthDatabase();
  const secret = process.env.BETTER_AUTH_SECRET?.trim();

  if (!database || !secret) {
    return null;
  }

  // Prefer env vars alone for baseURL/secret when set (Better Auth docs).
  return betterAuth({
    database,
    secret,
    baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BASE_URL,
    trustedOrigins: buildTrustedOrigins(),
    socialProviders: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID as string,
        clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
        scope: ["read:user", "user:email"],
      },
    },
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["github"],
      },
      updateAccountOnSignIn: true,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      // Cookie cache can leave a stale session_data cookie after sign-out and
      // confuse re-login / getSession. DB sessions are source of truth here.
      cookieCache: {
        enabled: false,
      },
    },
    plugins: [nextCookies()],
  });
}

type AuthInstance = NonNullable<ReturnType<typeof createAuth>>;

let cached: AuthInstance | null | undefined;

export function getAuth(): AuthInstance | null {
  if (cached !== undefined) {
    return cached;
  }
  cached = createAuth();
  return cached;
}

export type Session = AuthInstance["$Infer"]["Session"];
