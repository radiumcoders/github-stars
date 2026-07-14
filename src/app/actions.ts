"use server";

import {
  getGithubLogin,
  getGithubOAuthToken,
} from "@/lib/github-access-token";
import { getGithubStarsInfo, type GithubStarsResult } from "@/lib/github-stars-info";
import { normalizeRepoName } from "@/lib/normalize-repo-name";

export async function fetchGithubLogin(): Promise<string | null> {
  return getGithubLogin();
}

export async function fetchGithubStars(repoName: string): Promise<GithubStarsResult> {
  const token = await getGithubOAuthToken();
  if (!token) {
    return {
      ok: false,
      code: "missing_token",
      message:
        "Sign in with GitHub to authorize access before fetching stargazers. If you already signed in, sign out and sign in again so we can store a fresh token.",
    };
  }

  const repo = normalizeRepoName(repoName);
  if (!repo) {
    return {
      ok: false,
      code: "not_found",
      message: "Enter a repository name (e.g. github-stars).",
    };
  }

  const owner = await getGithubLogin();
  if (!owner) {
    return {
      ok: false,
      code: "forbidden",
      message:
        "Could not read your GitHub username. Sign out and sign in again to refresh authorization.",
    };
  }

  return getGithubStarsInfo(owner, repo, token);
}
