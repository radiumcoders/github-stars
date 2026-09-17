import assert from "node:assert/strict";
import test from "node:test";
import { classifyGithubError } from "../src/lib/github-errors";
import { GITHUB_SOCIAL_PROVIDER, isBlockedAuthPath } from "../src/lib/auth-paths";
import { createInstallState, verifyInstallState } from "../src/lib/github-install-state";
import { resolveInputProps } from "../src/lib/video-props";
import { defaultProps } from "../src/video/schema";

test("401 is reconnect, 429 is rate-limited, 403 without rate headers is forbidden", () => {
  assert.equal(classifyGithubError({ status: 401 }).code, "reconnect_required");
  assert.equal(classifyGithubError({ status: 429 }).code, "rate_limited");
  assert.equal(classifyGithubError({ status: 403 }).code, "forbidden");
  assert.equal(
    classifyGithubError({
      status: 403,
      headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "2000000000" },
    }).code,
    "rate_limited",
  );
});

test("GitHub provider requests no classic OAuth scopes", () => {
  assert.equal(GITHUB_SOCIAL_PROVIDER.disableDefaultScope, true);
  assert.deepEqual(GITHUB_SOCIAL_PROVIDER.scope, []);
});

test("token-returning auth HTTP paths are blocked", () => {
  assert.equal(isBlockedAuthPath("/api/auth/get-access-token"), true);
  assert.equal(isBlockedAuthPath("/api/auth/refresh-token"), true);
  assert.equal(isBlockedAuthPath("/api/auth/callback/github"), false);
  assert.equal(isBlockedAuthPath("/api/auth/sign-in/social"), false);
});

test("install state is session-bound and one-use comparable", () => {
  const secret = "synthetic-unit-test-only-secret-0123456789";
  const state = createInstallState("user-1", secret);
  assert.equal(verifyInstallState(state.value, "user-1", state.nonce, secret), true);
  assert.equal(verifyInstallState(state.value, "user-2", state.nonce, secret), false);
  assert.equal(verifyInstallState(state.value, "user-1", "other", secret), false);
});

test("runtime video props never inherit fixture faces", () => {
  assert.ok(defaultProps.stargazers.length > 0);
  const empty = resolveInputProps({
    user: "octo",
    repository: "demo",
    stars: 0,
    userAvatarUrl: "https://avatars.githubusercontent.com/u/1?v=4",
    stargazers: [],
  });
  assert.deepEqual(empty.stargazers, []);
  const omitted = resolveInputProps({
    user: "octo",
    repository: "demo",
    stars: 12,
    userAvatarUrl: "https://avatars.githubusercontent.com/u/1?v=4",
  });
  assert.deepEqual(omitted.stargazers, []);
});
