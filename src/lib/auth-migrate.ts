import { betterAuth } from "better-auth";
import { createSharedAuthOptions } from "@/lib/auth-options";
import { tryLoadGithubAppConfig } from "@/lib/github-app-config";

const loaded = tryLoadGithubAppConfig();

if (!loaded.ok) {
  throw new Error(
    "Set a valid GitHub App environment before running auth:migrate. Run pnpm run check:env.",
  );
}

/**
 * Config used only by `pnpm run auth:migrate`.
 * Same provider/schema options as runtime, without Next.js cookie plugins.
 */
export const auth = betterAuth(createSharedAuthOptions(loaded.config));
