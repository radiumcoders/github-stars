export const BLOCKED_TOKEN_PATHS = ["/get-access-token", "/refresh-token"] as const;

export const GITHUB_SOCIAL_PROVIDER = {
  disableDefaultScope: true,
  scope: ["read:user", "user:email"] as const,
};

export function isBlockedAuthPath(pathname: string): boolean {
  return BLOCKED_TOKEN_PATHS.some(
    (path) => pathname === `/api/auth${path}` || pathname.endsWith(path),
  );
}

export function githubProviderHasWriteScope(): boolean {
  return GITHUB_SOCIAL_PROVIDER.scope.some((scope) => /repo|write/i.test(scope));
}
