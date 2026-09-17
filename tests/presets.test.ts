import assert from "node:assert/strict";
import test from "node:test";
import { resolveInputProps } from "../src/lib/video-props";
import { presetIds } from "../src/video/presets";

test("every preset id can render with an empty avatar list", () => {
  for (const preset of presetIds) {
    const props = resolveInputProps({
      user: "octo",
      repository: "demo",
      stars: 42,
      userAvatarUrl: "https://avatars.githubusercontent.com/u/1?v=4",
      stargazers: [],
      preset,
    });
    assert.equal(props.preset, preset);
    assert.equal(props.stargazers.length, 0);
    assert.equal(props.stars, 42);
  }
});
