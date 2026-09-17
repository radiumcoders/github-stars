import { spawnSync } from "node:child_process";
import { loadProjectEnv } from "./load-env.mjs";

loadProjectEnv();

const apply = process.argv.includes("--apply");
const dryRun = process.argv.includes("--dry-run") || !apply;
const confirm = process.argv.find((arg) => arg.startsWith("--confirm-target="))?.slice("--confirm-target=".length);

if (apply && dryRun && process.argv.includes("--dry-run")) {
  console.error("Use either --dry-run or --apply, not both.");
  process.exit(1);
}

const { tryLoadGithubAppConfig } = await import("../src/lib/github-app-config.ts");
const loaded = tryLoadGithubAppConfig();
if (!loaded.ok) {
  console.error("Environment is not valid. Run pnpm run check:env.");
  for (const issue of loaded.check.issues) console.error(`- ${issue}`);
  process.exit(1);
}

const databaseHost = new URL(loaded.config.databaseUrl).host;
console.log(`Target database host: ${databaseHost}`);
console.log(`Auth origin: ${loaded.config.canonicalOrigin}`);
console.log("This command does not print secrets.");

if (dryRun) {
  console.log("Dry-run: no schema changes will be written.");
  console.log("Planned action: apply the Better Auth schema (user, session, account, verification) if missing, using pinned @better-auth/cli 1.4.21 with better-auth 1.7.5.");
  console.log("Review the target, then run: pnpm run auth:migrate --apply --confirm-target=" + databaseHost);
  process.exit(0);
}

if (confirm !== databaseHost) {
  console.error(`Apply refused. Pass --confirm-target=${databaseHost} to modify this database.`);
  process.exit(1);
}

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["--no-install", "@better-auth/cli", "migrate", "--config", "src/lib/auth-migrate.ts", "-y"],
  { stdio: "inherit", env: process.env, shell: process.platform === "win32" },
);
process.exit(result.status ?? 1);
