import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function parseEnv(contents) {
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, raw] = match;
    if (process.env[key] !== undefined) continue;
    let value = raw;
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

export function loadProjectEnv(cwd = process.cwd()) {
  for (const name of [".env", ".env.local"]) {
    const path = resolve(cwd, name);
    if (existsSync(path)) parseEnv(readFileSync(path, "utf8"));
  }
}
