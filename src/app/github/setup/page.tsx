import Link from "next/link";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { tryLoadGithubAppConfig } from "@/lib/github-app-config";
import {
  getVerifiedGithubAccessToken,
  resolveGithubAccount,
} from "@/lib/github-access-token";
import {
  INSTALL_STATE_COOKIE,
  listAuthorizedInstallations,
  verifyInstallState,
} from "@/lib/github-connection";

export const dynamic = "force-dynamic";

function SetupMessage({ title, body }: { title: string; body: string }) {
  return (
    <main id="main" className="mx-auto flex min-h-0 flex-1 flex-col justify-center gap-3 px-6 py-16">
      <h1 className="text-lg font-medium">{title}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{body}</p>
      <Link className="text-sm font-medium underline underline-offset-2" href="/">
        Return to GitHub Stars
      </Link>
    </main>
  );
}

export default async function GithubSetupPage({
  searchParams,
}: {
  searchParams: Promise<{
    installation_id?: string;
    setup_action?: string;
    state?: string;
  }>;
}) {
  const params = await searchParams;
  const loaded = tryLoadGithubAppConfig();
  if (!loaded.ok || !getAuth()) {
    return (
      <SetupMessage
        title="GitHub connection is unavailable"
        body="The service owner needs to finish configuration."
      />
    );
  }

  const cookieStore = await cookies();
  const stateCookie = cookieStore.get(INSTALL_STATE_COOKIE)?.value;
  cookieStore.delete(INSTALL_STATE_COOKIE);

  const outcome = await resolveSetupOutcome({
    params,
    stateCookie,
    secret: loaded.config.betterAuthSecret,
    config: loaded.config,
  });

  if (outcome.kind === "redirect") {
    redirect("/");
  }

  return <SetupMessage title={outcome.title} body={outcome.body} />;
}

async function resolveSetupOutcome({
  params,
  stateCookie,
  secret,
  config,
}: {
  params: { installation_id?: string; setup_action?: string; state?: string };
  stateCookie: string | undefined;
  secret: string;
  config: import("@/lib/github-app-config").GithubAppConfig;
}): Promise<
  | { kind: "redirect" }
  | { kind: "message"; title: string; body: string }
> {
  try {
    const account = await resolveGithubAccount(await headers());
    const stateOk = verifyInstallState(
      stateCookie,
      account.userId,
      params.state,
      secret,
    );

    if (params.setup_action === "request") {
      return {
        kind: "message",
        title: "Installation is waiting for approval",
        body: "An administrator still needs to approve this GitHub App for the organization. Return after it is approved and refresh the repository list.",
      };
    }

    const { token } = await getVerifiedGithubAccessToken(await headers());
    const installations = await listAuthorizedInstallations(token, config);

    if (params.installation_id) {
      const requestedId = Number(params.installation_id);
      const known = installations.some((installation) => installation.id === requestedId);
      if (!known) {
        return {
          kind: "message",
          title: "Repository access was not connected",
          body: "That installation is not available to the signed-in GitHub account. Sign in with the account that installed the app, or connect repositories again.",
        };
      }
    }

    if (!stateOk && installations.length === 0) {
      return {
        kind: "message",
        title: "Connect repositories",
        body: "Sign in first, then choose repositories from this app. The installation return did not include a valid session-bound state.",
      };
    }

    return { kind: "redirect" };
  } catch {
    return {
      kind: "message",
      title: "Sign in to finish connecting",
      body: "Install return is not enough by itself. Sign in with GitHub, then connect repositories from the app.",
    };
  }
}
