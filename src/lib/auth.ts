import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { createSharedAuthOptions } from "@/lib/auth-options";
import { tryLoadAuthConfig } from "@/lib/github-app-config";

function createAuth() {
  const loaded = tryLoadAuthConfig();
  if (!loaded.ok) return null;
  try {
    return betterAuth(createSharedAuthOptions(loaded.config, [nextCookies()]));
  } catch (error) {
    console.error("[auth] Failed to initialize authentication.");
    if (error instanceof Error && error.message && !/postgres|secret|token/i.test(error.message)) {
      console.error("[auth]", error.name);
    }
    return null;
  }
}

type AuthInstance = NonNullable<ReturnType<typeof createAuth>>;

let cached: AuthInstance | null = null;

export function getAuth(): AuthInstance | null {
  if (cached) return cached;
  const created = createAuth();
  if (created) cached = created;
  return created;
}

export type Session = AuthInstance["$Infer"]["Session"];
