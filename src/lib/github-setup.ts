import "server-only";

import { getAuth } from "@/lib/auth";
import { tryLoadGithubAppConfig, type GithubAppConfig } from "@/lib/github-app-config";
import {
  getVerifiedGithubAccessToken,
  resolveGithubAccount,
} from "@/lib/github-access-token";
import {
  listAuthorizedInstallations,
  verifyInstallState,
} from "@/lib/github-connection";
import type { SetupStatusKey } from "@/lib/github-setup-messages";

export type GithubSetupOutcome =
  | { kind: "redirect" }
  | { kind: "message"; status: SetupStatusKey };

export async function resolveGithubSetupOutcome(options: {
  params: { installation_id?: string; setup_action?: string; state?: string };
  stateCookie: string | undefined;
  requestHeaders: Headers;
}): Promise<GithubSetupOutcome> {
  const loaded = tryLoadGithubAppConfig();
  if (!loaded.ok || !getAuth()) {
    return { kind: "message", status: "unavailable" };
  }

  try {
    return await resolveAuthorizedSetupOutcome({
      params: options.params,
      stateCookie: options.stateCookie,
      secret: loaded.config.betterAuthSecret,
      config: loaded.config,
      requestHeaders: options.requestHeaders,
    });
  } catch {
    return { kind: "message", status: "signIn" };
  }
}

async function resolveAuthorizedSetupOutcome(options: {
  params: { installation_id?: string; setup_action?: string; state?: string };
  stateCookie: string | undefined;
  secret: string;
  config: GithubAppConfig;
  requestHeaders: Headers;
}): Promise<GithubSetupOutcome> {
  const account = await resolveGithubAccount(options.requestHeaders);
  const stateOk = verifyInstallState(
    options.stateCookie,
    account.userId,
    options.params.state,
    options.secret,
  );

  if (options.params.setup_action === "request") {
    return { kind: "message", status: "approval" };
  }

  const { token } = await getVerifiedGithubAccessToken(options.requestHeaders);
  const installations = await listAuthorizedInstallations(token, options.config);

  if (options.params.installation_id) {
    const requestedId = Number(options.params.installation_id);
    const known = installations.some((installation) => installation.id === requestedId);
    if (!known) {
      return { kind: "message", status: "notConnected" };
    }
  }

  if (!stateOk && installations.length === 0) {
    return { kind: "message", status: "connect" };
  }

  return { kind: "redirect" };
}
