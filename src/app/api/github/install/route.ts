import { cookies, headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { tryLoadGithubAppConfig } from "@/lib/github-app-config";
import { resolveGithubAccount } from "@/lib/github-access-token";
import {
  buildInstallStart,
  INSTALL_STATE_COOKIE,
  sameOrigin,
} from "@/lib/github-connection";
import { GithubAppError } from "@/lib/github-errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const loaded = tryLoadGithubAppConfig();
  if (!loaded.ok || !getAuth()) {
    return json(
      { error: "GitHub connection is unavailable. The service owner needs to finish configuration." },
      503,
    );
  }
  if (!sameOrigin(request, loaded.config.canonicalOrigin)) {
    return json({ error: "Invalid request origin." }, 403);
  }

  try {
    const account = await resolveGithubAccount(await headers());
    const start = buildInstallStart(account.userId, loaded.config);
    const cookieStore = await cookies();
    cookieStore.set({
      name: INSTALL_STATE_COOKIE,
      value: start.cookie.value,
      httpOnly: true,
      sameSite: "lax",
      secure: loaded.config.mode === "production",
      path: "/",
      maxAge: start.cookie.maxAge,
    });
    return json({ url: start.url });
  } catch (error) {
    if (error instanceof GithubAppError) {
      return json({ error: error.message, code: error.code }, error.code === "missing_token" ? 401 : 400);
    }
    return json({ error: "Could not start GitHub App installation." }, 400);
  }
}
