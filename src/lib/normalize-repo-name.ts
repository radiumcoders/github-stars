export function normalizeRepoName(input: string): string {
  const trimmed = input
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?github\.com\//i, "");

  if (!trimmed) {
    return "";
  }

  return trimmed.split("/").filter(Boolean).pop() ?? "";
}