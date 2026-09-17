import "server-only";

import {
  classifyGithubError,
  GithubAppError,
  userMessageFor,
  type GithubErrorCode,
} from "@/lib/github-errors";
import { tryLoadGithubAppConfig } from "@/lib/github-app-config";
import {
  getVerifiedGithubAccessToken,
} from "@/lib/github-access-token";
import { resolveAuthorizedRepository } from "@/lib/github-connection";
import {
  fetchTailStargazersWithResync,
  parseRepository,
} from "@/lib/github-repository";
import { Props } from "@/video/schema";

const GITHUB_API = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";
const REQUEST_TIMEOUT_MS = 20_000;

export type GithubStarsErrorCode = GithubErrorCode | "not_found";

export type GithubStarsResult =
  | {
      ok: true;
      data: Partial<Props>;
      mode: "full" | "count_only" | "zero_stars";
    }
  | {
      ok: false;
      code: GithubStarsErrorCode;
      message: string;
      retryAt?: string;
      data?: Partial<Props>;
    };

type RepoMetadata = {
  owner: string;
  repo: string;
  stars: number;
  userAvatarUrl: string;
};

async function githubRequest(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<{ status: number; headers: Headers; data: unknown }> {
  const url = `${GITHUB_API}${path}`;
  const parsed = new URL(url);
  if (parsed.origin !== GITHUB_API) {
    throw new GithubAppError("invalid_request", "Unsafe GitHub request.");
  }
  let attempt = 0;
  for (;;) {
    const response = await fetch(url, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
        Authorization: `Bearer ${token}`,
        ...init.headers,
      },
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    if (response.ok) {
      return { status: response.status, headers: response.headers, data };
    }
    if ((response.status === 502 || response.status === 503 || response.status === 504) && attempt < 2) {
      attempt += 1;
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
      continue;
    }
    const classified = classifyGithubError({
      status: response.status,
      headers: response.headers,
      response: { headers: response.headers, data },
    });
    throw new GithubAppError(classified.code, classified.message, {
      retryAt: classified.retryAt,
      status: response.status,
    });
  }
}

function mapFailure(error: unknown): GithubStarsResult {
  if (error instanceof GithubAppError) {
    const code: GithubStarsErrorCode =
      error.code === "repository_unavailable" ? "not_found" : error.code;
    return {
      ok: false,
      code,
      message: error.message || userMessageFor(error.code),
      retryAt: error.retryAt,
    };
  }
  if (error instanceof Error && /owner\/repository|Invalid repository/i.test(error.message)) {
    return {
      ok: false,
      code: "invalid_request",
      message: userMessageFor("invalid_request"),
    };
  }
  const classified = classifyGithubError(error);
  return {
    ok: false,
    code: classified.code === "repository_unavailable" ? "not_found" : classified.code,
    message: classified.message,
    retryAt: classified.retryAt,
  };
}

export async function getGithubStarsInfo(
  repository: string,
  token: string,
  options?: { countOnly?: boolean },
): Promise<GithubStarsResult> {
  const trimmedToken = token.trim();
  if (!trimmedToken) {
    return {
      ok: false,
      code: "missing_token",
      message: userMessageFor("missing_token"),
    };
  }

  let parsed;
  try {
    parsed = parseRepository(repository);
  } catch {
    return {
      ok: false,
      code: "invalid_request",
      message: userMessageFor("invalid_request"),
    };
  }

  try {
    const { data } = await githubRequest(
      `/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`,
      trimmedToken,
    );
    const repo = data as {
      stargazers_count?: number;
      name?: string;
      owner?: { login?: string; avatar_url?: string };
    };
    const metadata: RepoMetadata = {
      owner: repo.owner?.login || parsed.owner,
      repo: repo.name || parsed.repo,
      stars: Number(repo.stargazers_count ?? 0),
      userAvatarUrl:
        typeof repo.owner?.avatar_url === "string" ? repo.owner.avatar_url : "",
    };
    const base = {
      user: metadata.owner,
      userAvatarUrl: metadata.userAvatarUrl,
      repository: metadata.repo,
      stars: metadata.stars,
    };

    if (options?.countOnly) {
      return { ok: true, mode: "count_only", data: { ...base, stargazers: [] } };
    }
    if (metadata.stars === 0) {
      return { ok: true, mode: "zero_stars", data: { ...base, stargazers: [] } };
    }

    try {
      const { stargazers } = await fetchTailStargazersWithResync(
        `${metadata.owner}/${metadata.repo}`,
        async (page) => {
          const result = await githubRequest(
            `/repos/${encodeURIComponent(metadata.owner)}/${encodeURIComponent(metadata.repo)}/stargazers?per_page=100&page=${page}`,
            trimmedToken,
            {
              headers: {
                Accept: "application/vnd.github.star+json",
              },
            },
          );
          return {
            data: Array.isArray(result.data) ? result.data : [],
            link: result.headers.get("link") ?? undefined,
          };
        },
      );
      return {
        ok: true,
        mode: "full",
        data: {
          ...base,
          stargazers: stargazers.map((row) => row.avatarUrl),
        },
      };
    } catch (error) {
      const classified = error instanceof GithubAppError
        ? error
        : new GithubAppError(
            classifyGithubError(error).code,
            classifyGithubError(error).message,
          );
      if (classified.code === "rate_limited" || classified.code === "reconnect_required") {
        return mapFailure(classified);
      }
      return {
        ok: false,
        code: "stargazers_unavailable",
        message: userMessageFor("stargazers_unavailable"),
        data: { ...base, stargazers: [] },
      };
    }
  } catch (error) {
    return mapFailure(error);
  }
}

export async function fetchAuthorizedGithubStars(options: {
  requestHeaders: Headers;
  repository: string;
  repositoryId?: number;
  countOnly?: boolean;
}): Promise<GithubStarsResult> {
  const loaded = tryLoadGithubAppConfig();
  if (!loaded.ok) {
    return {
      ok: false,
      code: "not_configured",
      message: userMessageFor("not_configured"),
    };
  }
  try {
    const { token } = await getVerifiedGithubAccessToken(options.requestHeaders);
    const authorized = await resolveAuthorizedRepository({
      token,
      config: loaded.config,
      repository: options.repository,
      repositoryId: options.repositoryId,
    });
    return getGithubStarsInfo(authorized.fullName, token, {
      countOnly: options.countOnly,
    });
  } catch (error) {
    return mapFailure(error);
  }
}
