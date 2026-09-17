import { loadProjectEnv } from "./load-env.mjs";

loadProjectEnv();

const { checkEnvironment, detectMode } = await import("../src/lib/github-app-config.ts");
const mode = process.argv.includes("--production") ? "production" : detectMode(process.env);
const result = checkEnvironment(process.env, mode);

if (!result.ok) {
  console.error(`Environment check failed (${result.mode}).`);
  for (const issue of result.issues) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  console.log(`Environment shape is valid for ${result.mode}.`);
  console.log(result.limitation);
}

for (const warning of result.warnings) {
  console.warn(`warning: ${warning}`);
}
