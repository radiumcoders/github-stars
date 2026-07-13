import { betterAuth } from "better-auth";
import { createAuthDatabase } from "@/lib/auth-db";

const database = createAuthDatabase();

if (!database) {
  throw new Error(
    "Set POSTGRES_URL or DATABASE_URL before running auth:migrate.",
  );
}

export const auth = betterAuth({
  database,
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      scope: ["repo"],
    },
  },
});