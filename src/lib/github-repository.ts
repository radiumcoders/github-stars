export type ParsedRepository = {
  owner: string;
  repo: string;
  fullName: string;
  key: string;
};

export type StargazerRow = {
  id: string;
  avatarUrl: string;
  starredAt: string | null;
};

export type StargazerPage = {
  data: unknown[];
  link?: string;
};

export function parseRepository(value: unknown): ParsedRepository {
  if (typeof value !== "string") {
    throw new TypeError("Repository must be a string.");
  }
  let input = value.trim();
  if (!input || input.length > 240 || /[?#\\%@\s]/u.test(input)) {
    throw new Error("Enter an owner/repository or a plain GitHub repository URL.");
  }
  input = input
    .replace(/^https:\/\/github\.com\//i, "")
    .replace(/^github\.com\//i, "");
  input = input.replace(/\/$/, "").replace(/\.git$/i, "");
  const pieces = input.split("/");
  if (pieces.length !== 2) {
    throw new Error("Enter exactly owner/repository.");
  }
  const [owner, repo] = pieces;
  if (
    !/^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/i.test(owner) ||
    !/^[a-z0-9_.-]{1,100}$/i.test(repo) ||
    repo === "." ||
    repo === ".."
  ) {
    throw new Error("Invalid repository path.");
  }
  return { owner, repo, fullName: `${owner}/${repo}`, key: `${owner}/${repo}`.toLowerCase() };
}

export function lastPageFromLink(link: unknown, repository: string): number {
  if (link === undefined || link === null || link === "") return 1;
  if (typeof link !== "string") throw new Error("Invalid pagination header.");
  const { owner, repo } = parseRepository(repository);
  const expectedPath = `/repos/${owner}/${repo}/stargazers`.toLowerCase();
  let last: number | null = null;
  let hasNext = false;
  const entries = [...link.matchAll(/<([^>]+)>\s*;\s*rel="([^"]+)"/g)];
  if (!entries.length) throw new Error("Invalid pagination header.");
  for (const [, target, relation] of entries) {
    const url = new URL(target);
    if (
      url.origin !== "https://api.github.com" ||
      url.username ||
      url.password ||
      url.pathname.toLowerCase() !== expectedPath ||
      url.hash
    ) {
      throw new Error("Unsafe pagination target.");
    }
    const raw = url.searchParams.get("page");
    const page = Number(raw);
    if (
      !raw ||
      !/^\d+$/.test(raw) ||
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 1_000_000
    ) {
      throw new Error("Invalid pagination page.");
    }
    if (relation.split(/\s+/).includes("last")) {
      if (last !== null && last !== page) throw new Error("Conflicting last-page links.");
      last = page;
    }
    if (relation.split(/\s+/).includes("next")) hasNext = true;
  }
  if (last === null && hasNext) throw new Error("Pagination last page unavailable.");
  return last ?? 1;
}

function usableRows(rows: unknown[]): StargazerRow[] {
  return rows.flatMap((row) => {
    const user = (row as { user?: { id?: unknown; avatar_url?: unknown } } | null)?.user;
    if (
      !user ||
      !/^\d+$/.test(String(user.id ?? "")) ||
      !Number.isSafeInteger(Number(user.id)) ||
      Number(user.id) < 1
    ) {
      return [];
    }
    if (typeof user.avatar_url !== "string") return [];
    let url: URL;
    try {
      url = new URL(user.avatar_url);
    } catch {
      return [];
    }
    if (
      url.protocol !== "https:" ||
      url.hostname !== "avatars.githubusercontent.com" ||
      url.username ||
      url.password ||
      url.port
    ) {
      return [];
    }
    return [
      {
        id: String(user.id),
        avatarUrl: url.href,
        starredAt: (row as { starred_at?: string | null }).starred_at ?? null,
      },
    ];
  });
}

export async function fetchTailStargazers(
  repository: string,
  fetchPage: (page: number) => Promise<StargazerPage>,
  limit = 50,
): Promise<{ stargazers: StargazerRow[]; requestedPages: number[] }> {
  parseRepository(repository);
  if (typeof fetchPage !== "function") {
    throw new TypeError("A page fetcher is required.");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new RangeError("Limit must be 1..50.");
  }
  const requestedPages: number[] = [];
  const cache = new Map<number, StargazerPage>();
  async function read(page: number) {
    if (page < 1) throw new Error("Untrusted pagination targets are rejected.");
    if (!cache.has(page)) {
      requestedPages.push(page);
      const result = await fetchPage(page);
      if (!result || !Array.isArray(result.data)) {
        throw new Error("Invalid stargazer response.");
      }
      cache.set(page, result);
    }
    return cache.get(page)!;
  }
  const first = await read(1);
  const lastPage = lastPageFromLink(first.link, repository);
  const tail = await read(lastPage);
  if (lastPage > 1 && tail.data.length === 0) {
    throw new Error("Pagination changed; resynchronize once.");
  }
  let rows = usableRows(tail.data);
  if (lastPage > 1 && rows.length < limit) {
    rows = [...usableRows((await read(lastPage - 1)).data), ...rows];
  }
  const seen = new Set<string>();
  const selected: StargazerRow[] = [];
  for (let i = rows.length - 1; i >= 0 && selected.length < limit; i--) {
    if (!seen.has(rows[i].id)) {
      seen.add(rows[i].id);
      selected.unshift(rows[i]);
    }
  }
  return { stargazers: selected, requestedPages };
}

export async function fetchTailStargazersWithResync(
  repository: string,
  fetchPage: (page: number) => Promise<StargazerPage>,
  limit = 50,
) {
  try {
    return await fetchTailStargazers(repository, fetchPage, limit);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Pagination changed")) {
      return fetchTailStargazers(repository, fetchPage, limit);
    }
    throw error;
  }
}
