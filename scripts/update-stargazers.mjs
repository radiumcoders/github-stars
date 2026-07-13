#!/usr/bin/env node
/**
 * Fetches stargazers via GitHub REST API (star+json media type),
 * normalizes data, and writes stargazers.json, stargazers-wall.svg, stargazers-wall.md
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "public", "data");
const MAX_AVATARS = 48;
const PER_PAGE = 100;

const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
const totalStarsEnv = parseInt(process.env.TOTAL_STARS ?? "0", 10);

if (!token || !repository) {
  console.error("GITHUB_TOKEN and GITHUB_REPOSITORY are required");
  process.exit(1);
}

const [owner, repo] = repository.split("/");

async function fetchStargazersPage(page) {
  const url = `https://api.github.com/repos/${owner}/${repo}/stargazers?per_page=${PER_PAGE}&page=${page}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github.v3.star+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!res.ok) {
    throw new Error(`GitHub API error ${res.status}: ${await res.text()}`);
  }

  return res.json();
}

async function fetchRepoStarCount() {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) return 0;
  const data = await res.json();
  return data.stargazers_count ?? 0;
}

async function fetchAllStargazers() {
  const all = [];
  let page = 1;

  while (page <= 10) {
    const batch = await fetchStargazersPage(page);
    if (!batch.length) break;

    for (const item of batch) {
      all.push({
        login: item.user.login,
        avatar_url: item.user.avatar_url,
        starred_at: item.starred_at,
        html_url: item.user.html_url,
      });
    }

    if (batch.length < PER_PAGE) break;
    page++;
  }

  return all.sort(
    (a, b) => new Date(a.starred_at).getTime() - new Date(b.starred_at).getTime(),
  );
}

function generateWallSvg(stargazers, total) {
  const cols = 8;
  const rows = Math.ceil(Math.min(stargazers.length, MAX_AVATARS) / cols);
  const cellSize = 72;
  const gap = 12;
  const padding = 32;
  const width = cols * cellSize + (cols - 1) * gap + padding * 2;
  const height = Math.max(rows, 1) * cellSize + (rows - 1) * gap + padding * 2 + 48;
  const radius = cellSize / 2 - 2;

  const avatars = stargazers.slice(0, MAX_AVATARS);
  const avatarElements = avatars
    .map((s, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = padding + col * (cellSize + gap) + cellSize / 2;
      const cy = padding + 40 + row * (cellSize + gap) + cellSize / 2;
      const clipId = `clip-${i}`;

      return `
    <defs>
      <clipPath id="${clipId}">
        <circle cx="${cx}" cy="${cy}" r="${radius}"/>
      </clipPath>
    </defs>
    <circle cx="${cx}" cy="${cy}" r="${radius + 2}" fill="none" stroke="url(#ring-gradient)" stroke-width="2" opacity="0.85"/>
    <image href="${s.avatar_url}" x="${cx - radius}" y="${cy - radius}" width="${radius * 2}" height="${radius * 2}" clip-path="url(#${clipId})" preserveAspectRatio="xMidYMid slice"/>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#18181b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="50%" stop-color="#8b5cf6"/>
      <stop offset="100%" stop-color="#a78bfa"/>
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="100%" height="100%" rx="16" fill="url(#bg-gradient)"/>
  <text x="${padding}" y="${padding + 20}" fill="#e4e4e7" font-family="Inter, system-ui, sans-serif" font-size="18" font-weight="600">${owner}/${repo}</text>
  <text x="${padding}" y="${padding + 36}" fill="#a1a1aa" font-family="Inter, system-ui, sans-serif" font-size="13">★ ${total.toLocaleString()} stargazers · showing ${avatars.length}</text>
  <g filter="url(#glow)">${avatarElements}</g>
</svg>`;
}

function generateWallMd(stargazers, total) {
  const avatars = stargazers.slice(0, MAX_AVATARS);
  const grid = avatars
    .map(
      (s) =>
        `<a href="${s.html_url}" title="${s.login} — ${new Date(s.starred_at).toLocaleDateString()}"><img src="${s.avatar_url}" width="48" height="48" alt="${s.login}" style="border-radius:50%;border:2px solid #6366f1;margin:4px"/></a>`,
    )
    .join("\n");

  return `# Stargazer Wall — ${owner}/${repo}

★ **${total.toLocaleString()}** total stars · Updated ${new Date().toISOString().split("T")[0]}

![Stargazer wall](./stargazers-wall.svg)

<details>
<summary>Avatar grid (click to expand)</summary>

${grid}

</details>
`;
}

async function main() {
  mkdirSync(DATA_DIR, { recursive: true });

  console.log(`Fetching stargazers for ${owner}/${repo}...`);
  const [stargazers, repoStars] = await Promise.all([
    fetchAllStargazers(),
    fetchRepoStarCount(),
  ]);
  const total = totalStarsEnv || repoStars || stargazers.length;

  const data = {
    owner,
    repo,
    total_stars: total,
    updated_at: new Date().toISOString(),
    stargazers: stargazers.slice(0, MAX_AVATARS),
  };

  writeFileSync(join(DATA_DIR, "stargazers.json"), JSON.stringify(data, null, 2));
  writeFileSync(join(DATA_DIR, "stargazers-wall.svg"), generateWallSvg(stargazers, total));
  writeFileSync(join(DATA_DIR, "stargazers-wall.md"), generateWallMd(stargazers, total));

  console.log(`Wrote ${data.stargazers.length} stargazers (${total} total stars)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});