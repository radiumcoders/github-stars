import assert from "node:assert/strict";
import test from "node:test";
import { checkEnvironment, tryLoadAuthConfig, tryLoadGithubAppConfig, buildTrustedOrigins } from "../src/lib/github-app-config";

const dev = (): Record<string, string> => ({
  BETTER_AUTH_URL: "http://localhost:3000",
  NEXT_PUBLIC_BASE_URL: "http://localhost:3000",
  BETTER_AUTH_SECRET: "synthetic-unit-test-only-secret-0123456789",
  DATABASE_URL: "postgresql://test:test@db.example.invalid/demo?sslmode=require",
  GITHUB_CLIENT_ID: "synthetic-client-id",
  GITHUB_CLIENT_SECRET: "synthetic-client-secret",
  GITHUB_APP_ID: "12345",
  GITHUB_APP_SLUG: "stargazer-test",
});
const prod = (): Record<string, string> => ({
  ...dev(),
  BETTER_AUTH_URL: "https://stars.example.invalid",
  NEXT_PUBLIC_BASE_URL: "https://stars.example.invalid",
});

test("complete development shape passes without contacting any service", () => {
  assert.equal(checkEnvironment(dev()).ok, true);
});

test("complete production shape passes without claiming live credentials work", () => {
  const result = checkEnvironment(prod(), "production");
  assert.equal(result.ok, true);
  assert.match(result.limitation, /does not verify credentials/);
});

for (const key of [
  "BETTER_AUTH_SECRET",
  "DATABASE_URL",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "GITHUB_APP_ID",
  "GITHUB_APP_SLUG",
]) {
  test(`missing ${key} fails preflight`, () => {
    const env = dev();
    delete env[key];
    assert.equal(checkEnvironment(env).ok, false);
  });
}

test("one canonical origin is enough when the other is omitted", () => {
  const env = dev();
  delete env.NEXT_PUBLIC_BASE_URL;
  assert.equal(checkEnvironment(env).ok, true);
});

for (const [key, value] of [
  ["BETTER_AUTH_SECRET", "short"],
  ["GITHUB_APP_ID", "client-not-app-id"],
  ["GITHUB_APP_ID", "0"],
  ["GITHUB_APP_ID", "99999999999999999999"],
  ["GITHUB_APP_SLUG", "https://evil.example.invalid/apps/test"],
  ["GITHUB_CLIENT_SECRET", "YOUR_SECRET"],
  ["BETTER_AUTH_URL", "http://evil.example.invalid"],
  ["BETTER_AUTH_URL", "https://test.invalid/path"],
  ["BETTER_AUTH_URL", "https://user:secret@test.invalid"],
  ["BETTER_AUTH_URL", "http://localhost:3000?token=secret"],
  ["DATABASE_URL", "not a database URL"],
  ["DATABASE_URL", "postgresql://test:test@db.example.invalid/db?sslmode=disable"],
]) {
  test(`bad ${key} shape is rejected`, () => {
    const env = dev();
    env[key] = value;
    assert.equal(checkEnvironment(env).ok, false);
  });
}

test("production rejects localhost even when configured on both origins", () => {
  assert.equal(checkEnvironment(dev(), "production").ok, false);
});

test("public secret variables are rejected by name without showing their value", () => {
  const env = dev();
  env.NEXT_PUBLIC_GITHUB_CLIENT_SECRET = "SYNTHETIC_SENSITIVE_VALUE";
  const result = checkEnvironment(env);
  assert.equal(result.ok, false);
  assert.ok(!JSON.stringify(result).includes("SYNTHETIC_SENSITIVE_VALUE"));
});

test("configuration result never emits valid input values", () => {
  const env = dev();
  const text = JSON.stringify(checkEnvironment(env));
  for (const key of ["BETTER_AUTH_SECRET", "DATABASE_URL", "GITHUB_CLIENT_SECRET"]) {
    assert.ok(!text.includes(env[key]));
  }
});

test("legacy secrets and unnecessary PEM produce actionable warnings", () => {
  const env = dev();
  env.LEGACY_GITHUB_CLIENT_SECRET = "synthetic-legacy-secret";
  env.GITHUB_APP_PRIVATE_KEY = "synthetic-not-a-PEM";
  const result = checkEnvironment(env);
  assert.equal(result.warnings.length, 2);
  assert.ok(!JSON.stringify(result).includes("synthetic-legacy-secret"));
});

test("unknown environment mode fails closed", () => {
  assert.equal(checkEnvironment(dev(), "preview").ok, false);
});

test("database TLS assurance is requested when missing from production shape", () => {
  const env = prod();
  env.DATABASE_URL = "postgresql://test:test@db.example.invalid/db";
  const result = checkEnvironment(env, "production");
  assert.equal(result.ok, true);
  assert.match(result.warnings.join(" "), /enforces TLS/);
});

test("sign-in auth config does not require GitHub App ID or slug", () => {
  const env = dev();
  delete env.GITHUB_APP_ID;
  delete env.GITHUB_APP_SLUG;
  const loaded = tryLoadAuthConfig(env, "development");
  assert.equal(loaded.ok, true);
  assert.equal(checkEnvironment(env).ok, false);
});

test("localhost and 127.0.0.1 are equivalent development origins", () => {
  const env = dev();
  env.NEXT_PUBLIC_BASE_URL = "http://127.0.0.1:3000";
  assert.equal(checkEnvironment(env).ok, true);
  const loaded = tryLoadAuthConfig(env, "development");
  assert.equal(loaded.ok, true);
  if (loaded.ok) {
    assert.equal(loaded.config.canonicalOrigin, "http://localhost:3000");
  }
});

test("trusted origins include local host aliases used in development", () => {
  const origins = buildTrustedOrigins("http://localhost:3000");
  assert.ok(origins.includes("http://localhost:3000"));
  assert.ok(origins.includes("http://127.0.0.1:3000"));
  assert.ok(origins.includes("http://localhost:3001"));
});

test("GitHub App slug can be copied from the App URL", () => {
  const env = dev();
  env.GITHUB_APP_SLUG = "https://github.com/apps/starwall-radiumcoders";
  const loaded = tryLoadGithubAppConfig(env, "development");
  assert.equal(loaded.ok, true);
  if (loaded.ok) {
    assert.equal(loaded.config.githubAppSlug, "starwall-radiumcoders");
  }
});
