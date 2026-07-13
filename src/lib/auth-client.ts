import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // Same-origin relative base — avoids localhost vs production baseURL mismatches.
  basePath: "/api/auth",
});
