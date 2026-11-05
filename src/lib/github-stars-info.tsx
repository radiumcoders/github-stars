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
          "Access denied. Your GitHub OAuth authorization may not have access to this repository — try signing in again or use a repo you own or collaborate on.",
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
  repository: string,
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

  const [user, repo] = repository.split("/");
  if (!user || !repo) {
    return {
      ok: false,
      code: "not_found",
      message: "Enter a valid owner/repo (e.g. vercel/next.js).",
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

    const [recent, starHistory] = await Promise.all([
      Promise.all([
        lastPage > 1 ? getStargazers(lastPage - 1) : Promise.resolve([]),
        getStargazers(lastPage),
      ]),
      getStarHistory(lastPage + 1, stars),
    ]);
    const stargazers = recent.flat().slice(-50);

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
        starHistory,
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

  // Samples the first star on evenly spaced pages to plot growth over time
  // as [timestamp, cumulative stars] pairs. GitHub only serves the first
  // 400 pages of stargazers, so very large repos are sampled up to that
  // point and then joined to today's total. History is decorative, so any
  // failure just yields an empty list.
  async function getStarHistory(
    totalPages: number,
    stars: number,
  ): Promise<[number, number][]> {
    try {
      const reachable = Math.max(1, Math.min(totalPages, 400));
      const samples = Math.min(reachable, 10);
      const pages = [
        ...new Set(
          Array.from({ length: samples }, (_, i) =>
            samples === 1
              ? 1
              : Math.round(1 + (i * (reachable - 1)) / (samples - 1)),
          ),
        ),
      ];
      const points = await Promise.all(
        pages.map(async (page): Promise<[number, number] | null> => {
          const [first] = await getStargazers(page);
          if (!first?.starred_at) return null;
          return [Date.parse(first.starred_at), (page - 1) * 100 + 1];
        }),
      );
      const history = points.filter((p): p is [number, number] => p !== null);
      if (history.length === 0) return [];
      history.push([Date.now(), Math.max(stars, history.at(-1)![1])]);
      return history;
    } catch {
      return [];
    }
  }
}