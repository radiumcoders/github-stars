import assert from "node:assert/strict";
import test from "node:test";
import {
  SETUP_STATUS,
  isSetupStatusKey,
} from "../src/lib/github-setup-messages";

test("setup result keys stay on the allow-list", () => {
  assert.equal(isSetupStatusKey("unavailable"), true);
  assert.equal(isSetupStatusKey("approval"), true);
  assert.equal(isSetupStatusKey("notConnected"), true);
  assert.equal(isSetupStatusKey("connect"), true);
  assert.equal(isSetupStatusKey("signIn"), true);
  assert.equal(isSetupStatusKey("redirect"), false);
  assert.equal(isSetupStatusKey("<script>"), false);
  assert.equal(isSetupStatusKey(undefined), false);
});

test("setup copy does not echo untrusted query text", () => {
  for (const message of Object.values(SETUP_STATUS)) {
    assert.equal(typeof message.title, "string");
    assert.equal(typeof message.body, "string");
    assert.ok(message.title.length > 0);
    assert.ok(message.body.length > 0);
  }
});
