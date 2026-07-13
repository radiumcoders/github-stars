import { getAuth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

const auth = getAuth();
const handlers = auth ? toNextJsHandler(auth) : null;

function notConfigured() {
  return Response.json(
    {
      error:
        "Auth is not configured. Add DATABASE_URL (Neon Postgres) and BETTER_AUTH_SECRET.",
    },
    { status: 503 },
  );
}

export const GET = handlers?.GET ?? notConfigured;
export const POST = handlers?.POST ?? notConfigured;