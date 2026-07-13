import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { getAuthDatabase } from "@/lib/auth-db";

const trustedOrigins = [
  process.env.BETTER_AUTH_URL,
  process.env.NEXT_PUBLIC_BASE_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
].filter((origin): origin is string => Boolean(origin));

let cached: ReturnType<typeof betterAuth> | null = null;

function buildAuth(database: NonNullable<ReturnType<typeof getAuthDatabase>>) {
  return betterAuth({
    database,
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins,
    socialProviders: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID as string,
        clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
        scope: ["repo"],
      },
    },
    plugins: [nextCookies()],
  });
}

export function getAuth() {
  const database = getAuthDatabase();
  const secret = process.env.BETTER_AUTH_SECRET?.trim();

  if (!database || !secret) {
    return null;
  }

  cached ??= buildAuth(database) as unknown as ReturnType<typeof betterAuth>;
  return cached;
}

export type Session = NonNullable<ReturnType<typeof getAuth>>["$Infer"]["Session"];