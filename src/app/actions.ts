"use server";

import { getGithubOAuthToken } from "@/lib/github-access-token";
import {
  getGithubRepositories,
  type GithubRepositoriesResult,
} from "@/lib/github-repositories";
import { getGithubStarsInfo, type GithubStarsResult } from "@/lib/github-stars-info";

export async function fetchGithubStars(repository: string): Promise<GithubStarsResult> {
  const token = await getGithubOAuthToken();
  if (!token) {
    return {
      ok: false,
      code: "missing_token",
      message:
        "Sign in with GitHub to authorize access before fetching stargazers. If you already signed in, sign out and sign in again so we can store a fresh token.",
    };
  }
  return getGithubStarsInfo(repository, token);
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
