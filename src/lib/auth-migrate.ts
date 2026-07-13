import { betterAuth } from "better-auth";
import { createAuthDatabase } from "@/lib/auth-db";

const database = createAuthDatabase();

if (!database) {
  throw new Error("Set DATABASE_URL before running auth:migrate.");
}

/**
 * Config used only by `npm run auth:migrate`.
 * Keep social providers / scopes in sync with `src/lib/auth.ts`.
 */
export const auth = betterAuth({
  database,
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BASE_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
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
});
