"use server";

import { getGithubOAuthToken } from "@/lib/github-access-token";
import {
  getGithubRepositories,
  type GithubRepositoriesResult,
} from "@/lib/github-repositories";
import { getGithubStarsInfo, type GithubStarsResult } from "@/lib/github-stars-info";

export async function fetchGithubStars(repository: string): Promise<GithubStarsResult> {
  // Signed-in users get their own token (private repos, higher rate limit).
  // Everyone else falls back to the optional server token, then to anonymous
  // access, which is enough for any public repository.
  const token =
    (await getGithubOAuthToken()) ?? process.env.GITHUB_TOKEN?.trim() ?? null;
  return getGithubStarsInfo(repository, token || null);
}

export async function fetchGithubRepositories(): Promise<GithubRepositoriesResult> {
  const token = await getGithubOAuthToken();
  if (!token) {
    return {
      ok: false,
      message:
        "We couldn't read your GitHub token. Sign out and sign in again.",
    };
  }
  return getGithubRepositories(token);
}
