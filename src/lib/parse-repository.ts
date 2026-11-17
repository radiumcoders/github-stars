const NAME = /^[A-Za-z0-9._-]+$/;

/**
 * Turns whatever a user pastes into "owner/repo", or null when it isn't a
 * GitHub repository. Accepts plain `owner/repo`, any github.com URL (with or
 * without protocol, `www.`, extra path like `/tree/main`, query or hash), and
 * git remotes such as `git@github.com:owner/repo.git`.
 */
export function parseRepository(input: string): string | null {
  let value = input.trim();
  if (!value) return null;

  value = value
    .replace(/^git@github\.com:/i, "github.com/")
    .replace(/^(?:git\+)?(?:https?|git|ssh):\/\/(?:[^@/]+@)?/i, "")
    .replace(/[?#].*$/, "");

  const segments = value.split("/").filter(Boolean);
  const isGithubUrl = /^(?:www\.)?github\.com$/i.test(segments[0] ?? "");
  if (isGithubUrl) segments.shift();
  // Anything else must be exactly owner/repo, so other sites are rejected.
  else if (segments.length !== 2 || /^https?:|^git@/i.test(input.trim())) {
    return null;
  }

  const [owner, rawRepo] = segments;
  const repo = rawRepo?.replace(/\.git$/i, "");
  if (!owner || !repo) return null;
  if (!NAME.test(owner) || !NAME.test(repo)) return null;

  return `${owner}/${repo}`;
}
