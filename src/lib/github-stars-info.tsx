import { Props } from "@/video/schema";
import { Octokit } from "@octokit/rest";

export type GithubStarsErrorCode =
  | "missing_token"
  | "not_found"
  | "forbidden"
  | "rate_limited"
  | "unknown";

export type GithubStarsResult =
  | { ok: true; data: Partial<Props> }
  | { ok: false; code: GithubStarsErrorCode; message: string };

function createOctokit(token: string) {
  return new Octokit({
    auth: token,
    request: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, { ...init, next: { revalidate: 0 } }),
    },
  });
}

function mapError(err: unknown): GithubStarsResult {
  if (err && typeof err === "object" && "status" in err) {
    const status = (err as { status: number }).status;
    if (status === 401 || status === 403) {
      return {
        ok: false,
        code: "forbidden",
        message:
          "Access denied. This repository may be private — sign out and sign in again, or use a public repository.",
      };
    }
    if (status === 404) {
      return {
        ok: false,
        code: "not_found",
        message: "Repository not found or your token cannot access it.",
      };
    }
    if (status === 429) {
      return {
        ok: false,
        code: "rate_limited",
        message: "GitHub rate limit exceeded. Try again later.",
      };
    }
  }

  return {
    ok: false,
    code: "unknown",
    message: "Failed to fetch repository data. Check your token and repository name.",
  };
}

export async function getGithubStarsInfo(
  user: string,
  repo: string,
  token: string,
): Promise<GithubStarsResult> {
  const trimmedToken = token.trim();
  if (!trimmedToken) {
    return {
      ok: false,
      code: "missing_token",
      message:
        "GitHub authorization is required. Sign in with GitHub to grant access before fetching stargazers.",
    };
  }

  if (!user || !repo) {
    return {
      ok: false,
      code: "not_found",
      message: "Enter a repository name (e.g. github-stars).",
    };
  }

  const octokit = createOctokit(trimmedToken);

  try {
    const {
      data: { avatar_url: userAvatarUrl },
    } = await octokit.users.getByUsername({ username: user });
    const {
      data: { stargazers_count: stars },
    } = await octokit.repos.get({ owner: user, repo });

    const {
      headers: { link },
    } = await octokit.request("GET /repos/{owner}/{repo}/stargazers", {
      owner: user,
      repo,
      per_page: 100,
      page: 1,
      headers: {
        accept: "application/vnd.github.v3.star+json",
      },
    });

    const lastPage =
      (link
        ?.split(/\s*,\s*/)
        .map((l) => l.match(/<.*?page=(\d+)>; rel="(.*)"/) ?? [])
        .filter(([, , rel]) => rel === "last")
        .map(([, page]) => Number(page))[0] ?? 1) - 1;

    const stargazers = [
      ...(lastPage > 1 ? await getStargazers(lastPage - 1) : []),
      ...(await getStargazers(lastPage)),
    ].slice(-50);

    return {
      ok: true,
      data: {
        user,
        userAvatarUrl,
        repository: repo,
        stars,
        stargazers: stargazers
          .map((sg) => sg.user?.avatar_url ?? null)
          .filter(Boolean) as string[],
      },
    };
  } catch (err) {
    return mapError(err);
  }

  async function getStargazers(page: number) {
    const { data } = await octokit.request("GET /repos/{owner}/{repo}/stargazers", {
      owner: user,
      repo,
      per_page: 100,
      page,
      headers: {
        accept: "application/vnd.github.v3.star+json",
      },
    });
    return data as { user: { avatar_url: string }; starred_at: string }[];
  }
}