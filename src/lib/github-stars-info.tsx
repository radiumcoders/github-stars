import { parseRepository } from "@/lib/parse-repository";
import { Props } from "@/video/schema";
import { Octokit } from "@octokit/rest";

export type GithubStarsErrorCode =
  | "not_found"
  | "forbidden"
  | "rate_limited"
  | "unknown";

export type GithubStarsResult =
  | { ok: true; data: Partial<Props> }
  | { ok: false; code: GithubStarsErrorCode; message: string };

function createOctokit(token: string | null) {
  return new Octokit({
    // No token means anonymous access: public repositories only.
    auth: token ?? undefined,
    request: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, { ...init, next: { revalidate: 0 } }),
    },
  });
}

function isRateLimited(err: { status: number }) {
  if (err.status === 429) return true;
  if (err.status !== 403) return false;
  const response = (err as { response?: { headers?: Record<string, string> } })
    .response;
  return (
    response?.headers?.["x-ratelimit-remaining"] === "0" ||
    /rate limit/i.test((err as { message?: string }).message ?? "")
  );
}

function mapError(err: unknown, signedIn: boolean): GithubStarsResult {
  if (err && typeof err === "object" && "status" in err) {
    const error = err as { status: number };
    if (isRateLimited(error)) {
      return {
        ok: false,
        code: "rate_limited",
        message: signedIn
          ? "GitHub rate limit exceeded. Try again later."
          : "GitHub's hourly limit for requests without an account was reached. Try again later, or sign in with GitHub for a much higher limit.",
      };
    }
    if (error.status === 401 || error.status === 403) {
      return {
        ok: false,
        code: "forbidden",
        message: signedIn
          ? "Access denied. Your GitHub authorization may not have access to this repository. Try signing in again or use a repo you own or collaborate on."
          : "GitHub denied access to this repository. If it is private, sign in with GitHub first.",
      };
    }
    if (error.status === 404) {
      return {
        ok: false,
        code: "not_found",
        message: signedIn
          ? "Repository not found, or your GitHub account cannot access it."
          : "Repository not found. Check the link, or sign in with GitHub if it is private.",
      };
    }
  }

  return {
    ok: false,
    code: "unknown",
    message: "Failed to fetch repository data. Check the repository and try again.",
  };
}

/**
 * `token` is the signed-in user's GitHub token (or the server's fallback
 * token). Without one the request is anonymous: GitHub then refuses to list
 * stargazers, so recent ones are read from the repository's public star events.
 */
export async function getGithubStarsInfo(
  repository: string,
  token: string | null,
): Promise<GithubStarsResult> {
  const trimmedToken = token?.trim() || null;
  const signedIn = Boolean(trimmedToken);

  const [user, repo] = parseRepository(repository)?.split("/") ?? [];
  if (!user || !repo) {
    return {
      ok: false,
      code: "not_found",
      message:
        "Enter a GitHub repository link or owner/repo (e.g. vercel/next.js).",
    };
  }

  const octokit = createOctokit(trimmedToken);

  if (!signedIn) {
    try {
      return await getPublicStarsInfo(octokit, user, repo);
    } catch (err) {
      return mapError(err, false);
    }
  }

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
    return mapError(err, signedIn);
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

// GitHub keeps roughly the last 300 events per repository, 100 per page.
const EVENT_PAGES = 3;
const HISTORY_SAMPLES = 10;

/**
 * Anonymous variant for public repositories. The stargazers list needs
 * authentication, but "WatchEvent" (someone starred the repo) is in the public
 * event feed, which gives the most recent stargazers and when they starred.
 * Costs at most five requests against the 60/hour anonymous limit.
 */
async function getPublicStarsInfo(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<GithubStarsResult> {
  const [{ data: ownerData }, { data: repoData }] = await Promise.all([
    octokit.users.getByUsername({ username: owner }),
    octokit.repos.get({ owner, repo }),
  ]);
  const stars = repoData.stargazers_count;

  // Newest first. The feed is decorative, so a failed page is just skipped.
  const pages = await Promise.all(
    Array.from({ length: EVENT_PAGES }, (_, i) =>
      octokit.activity
        .listRepoEvents({ owner, repo, per_page: 100, page: i + 1 })
        .then((res) => res.data)
        .catch(() => []),
    ),
  );

  const seen = new Set<string>();
  const starEvents: { avatarUrl: string; at: number }[] = [];
  for (const event of pages.flat()) {
    if (event.type !== "WatchEvent" || !event.created_at) continue;
    const login = event.actor.login;
    if (seen.has(login)) continue;
    seen.add(login);
    starEvents.push({
      avatarUrl: event.actor.avatar_url,
      at: Date.parse(event.created_at),
    });
  }
  // Oldest first, matching the authenticated path.
  starEvents.reverse();

  const starHistory: [number, number][] = [];
  if (starEvents.length > 0) {
    const created = repoData.created_at ? Date.parse(repoData.created_at) : NaN;
    if (!Number.isNaN(created)) starHistory.push([created, 0]);
    const before = Math.max(0, stars - starEvents.length);
    const step = Math.max(1, Math.floor(starEvents.length / HISTORY_SAMPLES));
    for (let i = 0; i < starEvents.length; i += step) {
      starHistory.push([starEvents[i].at, before + i + 1]);
    }
    starHistory.push([Date.now(), stars]);
  }

  return {
    ok: true,
    data: {
      user: repoData.owner.login,
      userAvatarUrl: ownerData.avatar_url,
      repository: repoData.name,
      stars,
      stargazers: starEvents.slice(-50).map((event) => event.avatarUrl),
      starHistory,
    },
  };
}
