import { getAuth } from "@/lib/auth";
import { Octokit } from "@octokit/rest";
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

export async function getGithubLogin(): Promise<string | null> {
  const token = await getGithubOAuthToken();
  if (!token) {
    return null;
  }

  try {
    const octokit = new Octokit({ auth: token });
    const { data } = await octokit.users.getAuthenticated();
    return data.login;
  } catch (err) {
    console.error("[auth] Failed to read GitHub login:", err);
    return null;
  }
}
