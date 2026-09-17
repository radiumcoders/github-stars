import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { createSharedAuthOptions } from "@/lib/auth-options";
import { tryLoadGithubAppConfig } from "@/lib/github-app-config";

function createAuth() {
  const loaded = tryLoadGithubAppConfig();
  if (!loaded.ok) return null;
  try {
    return betterAuth(createSharedAuthOptions(loaded.config, [nextCookies()]));
  } catch {
    return null;
  }
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
