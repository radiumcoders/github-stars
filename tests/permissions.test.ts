import assert from "node:assert/strict";
import test from "node:test";
import {
  EXPECTED_POLICY,
  auditInstallation,
  auditPermissionSnapshot,
} from "../src/lib/github-permissions";

const policy = () => structuredClone(EXPECTED_POLICY);
const installation = () => ({
  id: 11,
  app_id: 123,
  app_slug: "stargazer-test",
  suspended_at: null,
  permissions: { metadata: "read" },
});

test("exact read-only policy passes a local snapshot check", () => {
  assert.equal(auditPermissionSnapshot(policy()).ok, true);
});

for (const [category, name, value] of [
  ["repository", "contents", "write"],
  ["repository", "contents", "read"],
  ["repository", "metadata", "write"],
  ["account", "emails", "write"],
  ["account", "starring", "write"],
  ["organization", "members", "read"],
  ["repository", "push", true],
] as const) {
  test(`out-of-policy ${category}.${name}=${value} fails`, () => {
    const candidate = policy() as Record<string, Record<string, unknown>>;
    candidate[category][name] = value;
    assert.equal(auditPermissionSnapshot(candidate).ok, false);
  });
}

test("explicit no-access fields are allowed", () => {
  const p = policy() as { repository: Record<string, string> };
  p.repository.contents = "none";
  assert.equal(auditPermissionSnapshot(p).ok, true);
});

test("required metadata read cannot be absent", () => {
  const p = policy() as { repository: Record<string, unknown> };
  delete p.repository.metadata;
  assert.equal(auditPermissionSnapshot(p).ok, false);
});

test("required private email read cannot be absent", () => {
  const p = policy() as { account: Record<string, unknown> };
  delete p.account.emails;
  assert.equal(auditPermissionSnapshot(p).ok, false);
});

test("missing and array permission snapshots fail closed", () => {
  assert.equal(auditPermissionSnapshot(null).ok, false);
  assert.equal(
    auditPermissionSnapshot({ repository: [], account: {}, organization: {} }).ok,
    false,
  );
});

test("matching active installation with metadata read passes", () => {
  assert.equal(auditInstallation(installation(), 123, "stargazer-test").ok, true);
});

for (const [field, value] of [
  ["app_id", 124],
  ["app_slug", "different-app"],
  ["suspended_at", "2026-09-16T00:00:00Z"],
  ["suspended_at", undefined],
] as const) {
  test(`installation rejects mismatched or unavailable ${field}`, () => {
    const row = installation() as Record<string, unknown>;
    row[field] = value;
    assert.equal(auditInstallation(row, 123, "stargazer-test").ok, false);
  });
}

test("installation rejects additional write permission", () => {
  const row = installation() as { permissions: Record<string, string> };
  row.permissions.contents = "write";
  assert.equal(auditInstallation(row, 123, "stargazer-test").ok, false);
});

test("a repository user push boolean is not an installation policy", () => {
  const row = installation();
  row.permissions = { push: true, pull: true, admin: true } as never;
  assert.equal(auditInstallation(row, 123, "stargazer-test").ok, false);
});

test("an unrelated user permission flag does not change the app policy", () => {
  const row = installation() as {
    repository_user_permissions?: { push: boolean };
  };
  row.repository_user_permissions = { push: true };
  assert.equal(auditInstallation(row, 123, "stargazer-test").ok, true);
});

test("a permission audit never claims to prove account-level consent", () => {
  assert.match(
    auditInstallation(installation(), 123, "stargazer-test").scope,
    /review account permissions separately/,
  );
  assert.match(auditPermissionSnapshot(policy()).scope, /not live proof/);
});

test("invalid expected app identity is a configuration error", () => {
  assert.throws(() => auditInstallation(installation(), "123" as never, "stargazer-test"));
  assert.throws(() => auditInstallation(installation(), 123, ""));
});
