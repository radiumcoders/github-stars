"use server";

import { headers } from "next/headers";
import {
  fetchAuthorizedGithubStars,
  type GithubStarsResult,
} from "@/lib/github-stars-info";

export async function fetchGithubStars(
  repository: string,
  options?: { repositoryId?: number; countOnly?: boolean },
): Promise<GithubStarsResult> {
  return fetchAuthorizedGithubStars({
    requestHeaders: await headers(),
    repository,
    repositoryId: options?.repositoryId,
    countOnly: options?.countOnly,
  });
}
