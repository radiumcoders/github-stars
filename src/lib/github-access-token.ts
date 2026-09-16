import { getAuth } from "@/lib/auth";
import { headers } from "next/headers";

export async function getGithubOAuthToken(): Promise<string | null> {
  const auth = getAuth();
  if (!auth) {
    return null;
  }

  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session?.user) {
    return null;
  }

  try {
    const tokens = await auth.api.getAccessToken({
      body: { providerId: "github" },
      headers: requestHeaders,
    });
    const token = tokens.accessToken?.trim();
    return token || null;
  } catch (err) {
    console.error("[auth] Failed to read GitHub access token:", err);
    return null;
  }
}
