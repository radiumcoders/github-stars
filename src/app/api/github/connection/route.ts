import { headers } from "next/headers";
import { getConnectionStatus } from "@/lib/github-connection";
import { GithubAppError } from "@/lib/github-errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const status = await getConnectionStatus(await headers());
    return Response.json(status, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof GithubAppError) {
      return Response.json(
        { error: error.message, code: error.code },
        {
          status: error.code === "missing_token" ? 401 : 400,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }
    return Response.json(
      { error: "Could not load GitHub connection." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
