import { loadProjectEnv } from "./load-env.mjs";

loadProjectEnv();

const apply = process.argv.includes("--apply");
const dryRun = !apply || process.argv.includes("--dry-run");
const confirm = process.argv.find((arg) => arg.startsWith("--confirm-target="))?.slice("--confirm-target=".length);

if (apply && process.argv.includes("--dry-run")) {
  console.error("Use either --dry-run or --apply, not both.");
  process.exit(1);
}

const { tryLoadGithubAppConfig } = await import("../src/lib/github-app-config.ts");
const loaded = tryLoadGithubAppConfig();
if (!loaded.ok) {
  console.error("Current app environment is not valid. Run pnpm run check:env.");
  process.exit(1);
}

const legacyId = process.env.LEGACY_GITHUB_CLIENT_ID?.trim();
const legacySecret = process.env.LEGACY_GITHUB_CLIENT_SECRET?.trim();
if (!legacyId || !legacySecret) {
  console.error("Set LEGACY_GITHUB_CLIENT_ID and LEGACY_GITHUB_CLIENT_SECRET only in the retirement runner.");
  process.exit(1);
}
if (legacyId === loaded.config.githubClientId) {
  console.error("Refusing to treat the current GitHub App Client ID as a legacy target.");
  process.exit(1);
}

const { Pool } = await import("@neondatabase/serverless");
const pool = new Pool({ connectionString: loaded.config.databaseUrl });
const databaseHost = new URL(loaded.config.databaseUrl).host;

async function tableExists(name) {
  const result = await pool.query(
    "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1",
    [name],
  );
  return result.rowCount > 0;
}

try {
  if (!(await tableExists("account"))) {
    console.log("No account table found. Nothing to retire.");
    process.exit(0);
  }

  const accounts = await pool.query(
    `SELECT id, "userId", "accountId", "providerId",
            ("accessToken" IS NOT NULL) AS has_token,
            scope
     FROM account
     WHERE "providerId" = 'github'`,
  );

  const candidates = accounts.rows.filter((row) => row.has_token);
  console.log(`Target database host: ${databaseHost}`);
  console.log(`Legacy Client ID: ${legacyId.slice(0, 6)}…`);
  console.log(`GitHub accounts with stored tokens: ${candidates.length}`);
  console.log("Tokens are not printed.");

  if (dryRun) {
    console.log("Dry-run: no GitHub revocations and no database writes.");
    console.log(`Review, then run: pnpm run auth:retire-legacy --apply --confirm-target=${databaseHost}`);
    process.exit(0);
  }

  if (confirm !== databaseHost) {
    console.error(`Apply refused. Pass --confirm-target=${databaseHost}.`);
    process.exit(1);
  }

  let revoked = 0;
  let unresolved = 0;
  for (const row of candidates) {
    const tokenResult = await pool.query(`SELECT "accessToken" FROM account WHERE id = $1`, [row.id]);
    const accessToken = tokenResult.rows[0]?.accessToken;
    if (!accessToken) continue;
    try {
      const response = await fetch(
        `https://api.github.com/applications/${encodeURIComponent(legacyId)}/grant`,
        {
          method: "DELETE",
          headers: {
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            Authorization: `Basic ${Buffer.from(`${legacyId}:${legacySecret}`).toString("base64")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ access_token: accessToken }),
        },
      );
      if (response.status === 204 || response.status === 404) {
        await pool.query("BEGIN");
        await pool.query(
          `UPDATE account
           SET "accessToken" = NULL, "refreshToken" = NULL, "accessTokenExpiresAt" = NULL,
               "refreshTokenExpiresAt" = NULL, scope = NULL
           WHERE id = $1`,
          [row.id],
        );
        await pool.query(`DELETE FROM session WHERE "userId" = $1`, [row.userId]);
        await pool.query("COMMIT");
        revoked += 1;
      } else {
        unresolved += 1;
        console.error(`Unresolved revocation for account row ${row.id}: HTTP ${response.status}`);
      }
    } catch {
      unresolved += 1;
      console.error(`Unresolved revocation for account row ${row.id}`);
    }
  }

  console.log(`Retired local credentials: ${revoked}`);
  console.log(`Unresolved revocations: ${unresolved}`);
  if (unresolved > 0) process.exitCode = 2;
} finally {
  await pool.end();
}
