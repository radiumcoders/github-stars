import { getAuth } from "@/lib/auth";
import { isBlockedAuthPath } from "@/lib/auth-paths";
import { toNextJsHandler } from "better-auth/next-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function notConfigured() {
  const message =
    "GitHub sign-in is unavailable. The service owner needs to finish configuration.";
  return Response.json(
    {
      error: message,
      message,
      code: "NOT_CONFIGURED",
    },
    {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

function blocked() {
  return Response.json(
    { error: "This endpoint is not available." },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  );
}

function isBlockedPath(request: Request): boolean {
  return isBlockedAuthPath(new URL(request.url).pathname);
}

function getHandler() {
  const auth = getAuth();
  return auth ? toNextJsHandler(auth) : null;
}

export async function GET(request: Request) {
  const handler = getHandler();
  if (!handler) return notConfigured();
  if (isBlockedPath(request)) return blocked();
  const response = await handler.GET(request);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: Request) {
  const handler = getHandler();
  if (!handler) return notConfigured();
  if (isBlockedPath(request)) return blocked();
  const response = await handler.POST(request);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
