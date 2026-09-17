import "server-only";

import {
  githubInstallUrl,
  githubManageInstallUrl,
  tryLoadGithubAppConfig,
  type GithubAppConfig,
} from "@/lib/github-app-config";
import { auditInstallation } from "@/lib/github-permissions";
import { GithubAppError, classifyGithubError } from "@/lib/github-errors";
import {
  getVerifiedGithubAccessToken,
  type GithubAccountContext,
} from "@/lib/github-access-token";
import type { ConnectedRepository, ConnectionStatus } from "@/lib/github-types";
import {
  createInstallState,
  INSTALL_STATE_COOKIE,
  INSTALL_STATE_MAX_AGE_SEC,
  verifyInstallState,
} from "@/lib/github-install-state";

const GITHUB_API = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";
const REQUEST_TIMEOUT_MS = 20_000;

export { INSTALL_STATE_COOKIE, createInstallState, verifyInstallState };

type GithubInstallation = {
  id: number;
  app_id: number;
  app_slug: string;
  suspended_at: string | null;
  permissions: Record<string, string>;
  repository_selection?: string;
  account?: { login?: string };
};

async function githubRequest(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<{ status: number; headers: Headers; data: unknown }> {
  const url = path.startsWith("http") ? path : `${GITHUB_API}${path}`;
  const parsed = new URL(url);
  if (parsed.origin !== GITHUB_API || parsed.username || parsed.password) {
    throw new GithubAppError("invalid_request", "Unsafe GitHub request.");
  }
  const response = await fetch(url, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
    cache: "no-store",
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const classified = classifyGithubError({
      status: response.status,
      headers: response.headers,
      response: { headers: response.headers, data },
    });
    throw new GithubAppError(classified.code, classified.message, {
      retryAt: classified.retryAt,
      status: response.status,
    });
  }
  return { status: response.status, headers: response.headers, data };
}

async function paginate<T>(
  path: string,
  token: string,
  read: (data: unknown) => T[],
): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  for (;;) {
    const separator = path.includes("?") ? "&" : "?";
    const { data } = await githubRequest(
      `${path}${separator}per_page=100&page=${page}`,
      token,
    );
    const batch = read(data);
    items.push(...batch);
    if (batch.length < 100 || page >= 50) break;
    page += 1;
  }
  return items;
}

function readInstallations(data: unknown): GithubInstallation[] {
  const payload = data as { installations?: GithubInstallation[] };
  return Array.isArray(payload.installations) ? payload.installations : [];
}

function readRepositories(data: unknown): Array<{
  id: number;
  full_name: string;
  private: boolean;
}> {
  const payload = data as {
    repositories?: Array<{ id: number; full_name: string; private: boolean }>;
  };
  return Array.isArray(payload.repositories) ? payload.repositories : [];
}

export async function listAuthorizedInstallations(
  token: string,
  config: GithubAppConfig,
): Promise<GithubInstallation[]> {
  const installations = await paginate(
    "/user/installations",
    token,
    readInstallations,
  );
  return installations.filter((installation) => {
    const audit = auditInstallation(
      installation,
      config.githubAppId,
      config.githubAppSlug,
    );
    return audit.ok;
  });
}

export async function listAuthorizedRepositories(
  token: string,
  config: GithubAppConfig,
): Promise<ConnectedRepository[]> {
  const installations = await listAuthorizedInstallations(token, config);
  const repositories: ConnectedRepository[] = [];
  for (const installation of installations) {
    const rows = await paginate(
      `/user/installations/${installation.id}/repositories`,
      token,
      readRepositories,
    );
    for (const row of rows) {
      if (!row?.id || typeof row.full_name !== "string") continue;
      repositories.push({
        id: row.id,
        fullName: row.full_name,
        private: Boolean(row.private),
        installationId: installation.id,
      });
    }
  }
  repositories.sort((a, b) => a.fullName.localeCompare(b.fullName));
  return repositories;
}

export async function resolveAuthorizedRepository(options: {
  token: string;
  config: GithubAppConfig;
  repository?: string;
  repositoryId?: number;
}): Promise<ConnectedRepository> {
  const repositories = await listAuthorizedRepositories(options.token, options.config);
  if (repositories.length === 0) {
    throw new GithubAppError("install_required", "Connect a repository first.");
  }
  const match = repositories.find((row) => {
    if (options.repositoryId && row.id === options.repositoryId) return true;
    if (
      options.repository &&
      row.fullName.toLowerCase() === options.repository.toLowerCase()
    ) {
      return true;
    }
    return false;
  });
  if (!match) {
    throw new GithubAppError(
      "repository_unavailable",
      "Repository unavailable. It may not exist, may not be selected, or may not be accessible to your account.",
    );
  }
  if (options.repositoryId && options.repository) {
    if (
      match.id !== options.repositoryId ||
      match.fullName.toLowerCase() !== options.repository.toLowerCase()
    ) {
      throw new GithubAppError("repository_unavailable", "Repository unavailable.");
    }
  }
  return match;
}

export async function getConnectionStatus(
  requestHeaders: Headers,
): Promise<ConnectionStatus> {
  const loaded = tryLoadGithubAppConfig();
  if (!loaded.ok) {
    return {
      configured: false,
      connected: false,
      pending: false,
      appSlug: null,
      installUrl: null,
      manageUrl: null,
      repositoryCount: 0,
      repositories: [],
    };
  }
  const { token } = await getVerifiedGithubAccessToken(requestHeaders);
  const repositories = await listAuthorizedRepositories(token, loaded.config);
  const manageUrl = repositories[0]
    ? githubManageInstallUrl(repositories[0].installationId)
    : `https://github.com/settings/installations`;
  return {
    configured: true,
    connected: repositories.length > 0,
    pending: false,
    appSlug: loaded.config.githubAppSlug,
    installUrl: githubInstallUrl(loaded.config.githubAppSlug),
    manageUrl,
    repositoryCount: repositories.length,
    repositories,
  };
}

export function buildInstallStart(userId: string, config: GithubAppConfig) {
  const state = createInstallState(userId, config.betterAuthSecret);
  return {
    cookie: {
      name: INSTALL_STATE_COOKIE,
      value: state.value,
      maxAge: INSTALL_STATE_MAX_AGE_SEC,
    },
    url: githubInstallUrl(config.githubAppSlug, state.nonce),
  };
}

export function sameOrigin(request: Request, origin: string): boolean {
  const header = request.headers.get("origin") || request.headers.get("referer");
  if (!header) return request.headers.get("sec-fetch-site") === "same-origin";
  try {
    return new URL(header).origin === origin;
  } catch {
    return false;
  }
}

export type { GithubAccountContext };
