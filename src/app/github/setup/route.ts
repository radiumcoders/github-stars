import { NextResponse, type NextRequest } from "next/server";
import { INSTALL_STATE_COOKIE } from "@/lib/github-connection";
import { resolveGithubSetupOutcome } from "@/lib/github-setup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function queryParam(url: URL, key: string): string | undefined {
  return url.searchParams.get(key) ?? undefined;
}

function clearInstallStateCookie(response: NextResponse, request: NextRequest) {
  response.cookies.set({
    name: INSTALL_STATE_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}

function redirectTo(request: NextRequest, path: string) {
  const response = NextResponse.redirect(new URL(path, request.nextUrl.origin), 303);
  clearInstallStateCookie(response, request);
  return response;
}

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const outcome = await resolveGithubSetupOutcome({
      params: {
        installation_id: queryParam(url, "installation_id"),
        setup_action: queryParam(url, "setup_action"),
        state: queryParam(url, "state"),
      },
      stateCookie: request.cookies.get(INSTALL_STATE_COOKIE)?.value,
      requestHeaders: request.headers,
    });

    if (outcome.kind === "redirect") {
      return redirectTo(request, "/");
    }

    return redirectTo(request, `/github/setup-result?status=${outcome.status}`);
  } catch {
    return redirectTo(request, "/github/setup-result?status=signIn");
  }
}
