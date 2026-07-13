import type { Stargazer, StargazerData } from "./types";
import { MAX_WALL_AVATARS } from "./types";

export function parseRepoInput(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim().replace(/^https?:\/\/github\.com\//, "");
  const match = trimmed.match(/^([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

export function sortByStarredAt(stargazers: Stargazer[]): Stargazer[] {
  return [...stargazers].sort(
    (a, b) => new Date(a.starred_at).getTime() - new Date(b.starred_at).getTime(),
  );
}

export function normalizeStargazers(
  owner: string,
  repo: string,
  stargazers: Stargazer[],
  totalStars?: number,
): StargazerData {
  const sorted = sortByStarredAt(stargazers);
  return {
    owner,
    repo,
    total_stars: totalStars ?? sorted.length,
    updated_at: new Date().toISOString(),
    stargazers: sorted.slice(0, MAX_WALL_AVATARS),
  };
}

export function filterStargazers(stargazers: Stargazer[], query: string): Stargazer[] {
  const q = query.trim().toLowerCase();
  if (!q) return stargazers;
  return stargazers.filter((s) => s.login.toLowerCase().includes(q));
}

export function getDataUrl(owner: string, repo: string, branch = "main"): string {
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/data/stargazers.json`;
}

export async function fetchStargazerData(
  owner: string,
  repo: string,
  source: "api" | "local" | "raw" = "api",
): Promise<StargazerData> {
  if (source === "local") {
    const res = await fetch("/data/stargazers.json");
    if (!res.ok) throw new Error("Local stargazers data not found");
    return res.json();
  }

  if (source === "raw") {
    const res = await fetch(getDataUrl(owner, repo));
    if (!res.ok) throw new Error(`Could not fetch data for ${owner}/${repo}`);
    return res.json();
  }

  const res = await fetch(`/api/stargazers?owner=${owner}&repo=${repo}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to fetch" }));
    throw new Error(err.error ?? "Failed to fetch stargazers");
  }
  return res.json();
}

export function buildStarHistoryPoints(stargazers: Stargazer[]): { date: string; stars: number }[] {
  const sorted = sortByStarredAt(stargazers);
  return sorted.map((s, i) => ({
    date: s.starred_at,
    stars: i + 1,
  }));
}