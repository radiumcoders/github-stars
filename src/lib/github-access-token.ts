import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { getAuthDatabase } from "@/lib/auth-db";
import { getAuth } from "@/lib/auth";
import { tryLoadAuthConfig } from "@/lib/github-app-config";
import { GithubAppError, sanitizeLogMeta } from "@/lib/github-errors";

const GITHUB_API = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";
const TOKEN_CHECK_TIMEOUT_MS = 15_000;

export type GithubAccountContext = {
  userId: string;
  accountRowId: string;
  providerUserId: string;
};

type TokenCheck = {
  appClientId: string;
  providerUserId: string;
  expiresAt: string | null;
};

const refreshLocks = new Map<string, Promise<string>>();

function logAuthFailure(stage: string, error: unknown) {
  const err = error as { status?: number; message?: string };
  console.error(
    "[github-auth]",
    JSON.stringify(
      sanitizeLogMeta({
        stage,
        status: err?.status,
        code: error instanceof GithubAppError ? error.code : "unknown",
      }),
    ),
  );
}

async function githubJson(
  url: string,
  init: RequestInit,
): Promise<{ status: number; headers: Headers; data: unknown }> {
  const parsed = new URL(url);
  if (parsed.origin !== GITHUB_API) {
    throw new GithubAppError("invalid_request", "Unsafe GitHub request.");
  }
  const response = await fetch(url, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(TOKEN_CHECK_TIMEOUT_MS),
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
      ...init.headers,
    },
    cache: "no-store",
  });
  const data = await response.json().catch(() => null);
  return { status: response.status, headers: response.headers, data };
}

function basicAuth(clientId: string, clientSecret: string) {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

export async function checkGithubToken(
  token: string,
  clientId: string,
  clientSecret: string,
): Promise<TokenCheck> {
  const { status, data } = await githubJson(
    `${GITHUB_API}/applications/${encodeURIComponent(clientId)}/token`,
    {
      method: "POST",
      headers: {
        Authorization: basicAuth(clientId, clientSecret),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ access_token: token }),
    },
  );

  if (status === 404 || status === 401) {
    throw new GithubAppError("reconnect_required", "Reconnect your GitHub account.");
  }
  if (status >= 500) {
    throw new GithubAppError("upstream_unavailable", "Could not verify GitHub authorization.");
  }
  if (status !== 200 || !data || typeof data !== "object") {
    throw new GithubAppError("reconnect_required", "Reconnect your GitHub account.");
  }

  const payload = data as {
    token?: string;
    app?: { client_id?: string };
    user?: { id?: number };
    expires_at?: string | null;
  };
  const appClientId = payload.app?.client_id;
  const providerUserId = payload.user?.id;
  if (!appClientId || !providerUserId) {
    throw new GithubAppError("reconnect_required", "Reconnect your GitHub account.");
  }

  return {
    appClientId,
    providerUserId: String(providerUserId),
    expiresAt: payload.expires_at ?? null,
  };
}

async function withAccountLock<T>(accountRowId: string, fn: () => Promise<T>): Promise<T> {
  const pool = getAuthDatabase();
  if (!pool) return fn();

  const key = createHmac("sha256", "github-stars-refresh")
    .update(accountRowId)
    .digest()
    .readInt32BE(0);
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [key]);
    return await fn();
  } finally {
    try {
      await client.query("SELECT pg_advisory_unlock($1)", [key]);
    } catch {
      // Ignore unlock failures; the connection is being released.
    }
    client.release();
  }
}

export async function resolveGithubAccount(
  requestHeaders: Headers,
): Promise<GithubAccountContext> {
  const auth = getAuth();
  if (!auth) {
    throw new GithubAppError("not_configured", "GitHub connection is unavailable.");
  }
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user?.id) {
    throw new GithubAppError("missing_token", "Sign in with GitHub first.");
  }

  const accounts = await auth.api.listUserAccounts({ headers: requestHeaders });
  const githubAccounts = (accounts ?? []).filter(
    (account) => account.providerId === "github",
  );
  if (githubAccounts.length === 0) {
    throw new GithubAppError("reconnect_required", "Reconnect your GitHub account.");
  }
  if (githubAccounts.length > 1) {
    throw new GithubAppError(
      "reconnect_required",
      "Multiple GitHub accounts are linked. Sign out and reconnect the account you want to use.",
    );
  }
  const account = githubAccounts[0];
  if (!account.id || !account.accountId) {
    throw new GithubAppError("reconnect_required", "Reconnect your GitHub account.");
  }
  return {
    userId: session.user.id,
    accountRowId: account.id,
    providerUserId: String(account.accountId),
  };
}

export async function getVerifiedGithubAccessToken(
  requestHeaders: Headers,
): Promise<{ token: string; account: GithubAccountContext }> {
  const loaded = tryLoadAuthConfig();
  if (!loaded.ok) {
    throw new GithubAppError("not_configured", "GitHub connection is unavailable.");
  }
  const auth = getAuth();
  if (!auth) {
    throw new GithubAppError("not_configured", "GitHub connection is unavailable.");
  }

  const account = await resolveGithubAccount(requestHeaders);
  const existing = refreshLocks.get(account.accountRowId);
  if (existing) {
    return { token: await existing, account };
  }

  const load = withAccountLock(account.accountRowId, async () => {
    const tokens = await auth.api.getAccessToken({
      body: {
        accountId: account.accountRowId,
      },
      headers: requestHeaders,
    });
    const token = tokens.accessToken?.trim();
    if (!token) {
      throw new GithubAppError("reconnect_required", "Reconnect your GitHub account.");
    }

    const check = await checkGithubToken(
      token,
      loaded.config.githubClientId,
      loaded.config.githubClientSecret,
    );
    if (check.appClientId !== loaded.config.githubClientId) {
      throw new GithubAppError(
        "reconnect_required",
        "This authorization belongs to a different GitHub App. Reconnect with the current service.",
      );
    }
    if (check.providerUserId !== account.providerUserId) {
      throw new GithubAppError("reconnect_required", "Reconnect your GitHub account.");
    }
    return token;
  });

  refreshLocks.set(account.accountRowId, load);
  try {
    const token = await load;
    return { token, account };
  } catch (error) {
    logAuthFailure("get_access_token", error);
    if (error instanceof GithubAppError) throw error;
    throw new GithubAppError("reconnect_required", "Reconnect your GitHub account.");
  } finally {
    if (refreshLocks.get(account.accountRowId) === load) {
      refreshLocks.delete(account.accountRowId);
    }
  }
}

export function timingSafeStringEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** @deprecated Use getVerifiedGithubAccessToken. Kept for a short compatibility window. */
export async function getGithubOAuthToken(): Promise<string | null> {
  try {
    const { headers } = await import("next/headers");
    const { token } = await getVerifiedGithubAccessToken(await headers());
    return token;
  } catch {
    return null;
  }
}
