import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { getAuthDatabase } from "@/lib/auth-db";

const trustedOrigins = [
  process.env.BETTER_AUTH_URL,
  process.env.NEXT_PUBLIC_BASE_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  "http://localhost:3000",
].filter((origin): origin is string => Boolean(origin));

function createAuth() {
  const database = getAuthDatabase();
  const secret = process.env.BETTER_AUTH_SECRET?.trim();

  if (!database || !secret) {
    return null;
  }

  return betterAuth({
    database,
    secret,
    baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BASE_URL,
    trustedOrigins,
    socialProviders: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID as string,
        clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
        // repo: read private repos the user can access (stargazers API)
        scope: ["read:user", "repo"],
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
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // refresh session every day
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
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
