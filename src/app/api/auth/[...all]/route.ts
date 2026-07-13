import { getAuth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

function notConfigured() {
  return Response.json(
    {
      error:
        "Auth is not configured. Add DATABASE_URL (Neon Postgres), BETTER_AUTH_SECRET, GITHUB_CLIENT_ID, and GITHUB_CLIENT_SECRET.",
    },
    { status: 503 },
  );
}

const auth = getAuth();

export const { GET, POST } = auth
  ? toNextJsHandler(auth)
  : { GET: notConfigured, POST: notConfigured };
