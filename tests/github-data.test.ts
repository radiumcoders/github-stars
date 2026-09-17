import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchTailStargazers,
  lastPageFromLink,
  parseRepository,
} from "../src/lib/github-repository";

test("repository parser accepts owner/repo forms", () => {
  for (const value of [
    "octo/demo",
    "  octo/demo  ",
    "https://github.com/octo/demo",
    "https://github.com/octo/demo.git/",
    "github.com/octo/demo",
  ]) {
    assert.deepEqual(parseRepository(value), {
      owner: "octo",
      repo: "demo",
      fullName: "octo/demo",
      key: "octo/demo",
    });
  }
});

test("repository parser rejects unsafe or extra paths", () => {
  for (const value of [
    "",
    "octo",
    "octo/demo/extra",
    "https://evil.example/octo/demo",
    "octo/demo?ref=main",
    "../etc/passwd",
    "octo/.",
  ]) {
    assert.throws(() => parseRepository(value));
  }
});

function avatar(id: number) {
  return {
    user: {
      id,
      avatar_url: `https://avatars.githubusercontent.com/u/${id}?v=4`,
    },
    starred_at: "2026-01-01T00:00:00Z",
  };
}

function pages(total: number) {
  const rows = Array.from({ length: total }, (_, i) => avatar(i + 1));
  const last = Math.max(1, Math.ceil(total / 100) || 1);
  return async (page: number) => {
    assert.ok(page >= 1, "must never request page zero");
    const start = (page - 1) * 100;
    const data = rows.slice(start, start + 100);
    const link =
      last === 1
        ? undefined
        : `<https://api.github.com/repos/octo/demo/stargazers?page=${last}>; rel="last"`;
    return { data, link: page === 1 ? link : undefined };
  };
}

for (const total of [0, 1, 50, 100, 101, 150, 200, 201]) {
  test(`tail pagination covers ${total} stargazers without page zero`, async () => {
    const { stargazers, requestedPages } = await fetchTailStargazers(
      "octo/demo",
      pages(total),
    );
    assert.ok(requestedPages.every((page) => page >= 1));
    assert.ok(!requestedPages.includes(0));
    const expected = Math.min(50, total);
    assert.equal(stargazers.length, expected);
    if (total > 0) {
      assert.equal(stargazers.at(-1)?.id, String(total));
    }
  });
}

test("untrusted pagination targets are rejected", () => {
  assert.throws(() =>
    lastPageFromLink(
      '<https://evil.example/repos/octo/demo/stargazers?page=2>; rel="last"',
      "octo/demo",
    ),
  );
});

test("last page is not omitted when a last link exists", async () => {
  const requested: number[] = [];
  await fetchTailStargazers("octo/demo", async (page) => {
    requested.push(page);
    if (page === 1) {
      return {
        data: Array.from({ length: 100 }, (_, i) => avatar(i + 1)),
        link: '<https://api.github.com/repos/octo/demo/stargazers?page=3>; rel="last"',
      };
    }
    return {
      data: Array.from({ length: page === 3 ? 10 : 100 }, (_, i) =>
        avatar((page - 1) * 100 + i + 1),
      ),
    };
  });
  assert.ok(requested.includes(3));
  assert.ok(!requested.includes(0));
});
