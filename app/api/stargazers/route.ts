import { NextRequest, NextResponse } from "next/server";
import { normalizeStargazers } from "@/lib/stargazers";
import type { Stargazer } from "@/lib/types";
import { MAX_WALL_AVATARS } from "@/lib/types";

const PER_PAGE = 100;
const MAX_PAGES = 5;

interface GitHubStarEntry {
  user: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
  starred_at: string;
}

async function fetchStargazersPage(
  owner: string,
  repo: string,
  page: number,
  token?: string,
): Promise<GitHubStarEntry[]> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3.star+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/stargazers?per_page=${PER_PAGE}&page=${page}`,
    { headers, next: { revalidate: 3600 } },
  );

  if (!res.ok) {
    if (res.status === 404) throw new Error("Repository not found");
    if (res.status === 403) throw new Error("Rate limited — try again later or use local data");
    throw new Error(`GitHub API error: ${res.status}`);
  }

  return res.json();
}

async function fetchRepoStars(owner: string, repo: string, token?: string): Promise<number> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers,
    next: { revalidate: 3600 },
  });

  if (!res.ok) return 0;
  const data = await res.json();
  return data.stargazers_count ?? 0;
}

export async function GET(request: NextRequest) {
  const owner = request.nextUrl.searchParams.get("owner");
  const repo = request.nextUrl.searchParams.get("repo");

  if (!owner || !repo) {
    return NextResponse.json({ error: "owner and repo are required" }, { status: 400 });
  }

  const token = process.env.GITHUB_TOKEN;

  try {
    const [totalStars, ...pages] = await Promise.all([
      fetchRepoStars(owner, repo, token),
      ...Array.from({ length: MAX_PAGES }, (_, i) =>
        fetchStargazersPage(owner, repo, i + 1, token),
      ),
    ]);

    const stargazers: Stargazer[] = [];
    for (const page of pages) {
      if (!page.length) continue;
      for (const item of page) {
        stargazers.push({
          login: item.user.login,
          avatar_url: item.user.avatar_url,
          starred_at: item.starred_at,
          html_url: item.user.html_url,
        });
        if (stargazers.length >= MAX_WALL_AVATARS) break;
      }
      if (stargazers.length >= MAX_WALL_AVATARS) break;
    }

    const data = normalizeStargazers(owner, repo, stargazers, totalStars);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}