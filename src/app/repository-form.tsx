"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useEffect, useState } from "react";

const TOKEN_STORAGE_KEY = "github-stars-token";

export function RepositoryForm({
  initialRepository,
  onSubmit,
  loading,
}: {
  initialRepository: string;
  onSubmit: (repository: string, token: string) => void;
  loading?: boolean;
}) {
  const [repository, setRepository] = useState(initialRepository);
  const [token, setToken] = useState("");

  useEffect(() => {
    const saved = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (saved) setToken(saved);
  }, []);

  return (
    <form
      className="flex w-full max-w-md flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const cleanRepository = repository
          .trim()
          .replace(/^(https?:\/\/)?github.com\//, "");
        const cleanToken = token.trim();
        sessionStorage.setItem(TOKEN_STORAGE_KEY, cleanToken);
        setRepository(cleanRepository);
        onSubmit(cleanRepository, cleanToken);
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="repository">Repository</Label>
        <Input
          id="repository"
          name="repository"
          placeholder="e.g. your-org/your-repo"
          className="text-base"
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          enterKeyHint="go"
          required
          value={repository}
          onChange={(event) => setRepository(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="github-token">GitHub token</Label>
        <Input
          id="github-token"
          name="github-token"
          type="password"
          placeholder="ghp_… or github_pat_…"
          className="font-mono text-sm"
          autoComplete="off"
          required
          value={token}
          onChange={(event) => setToken(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Required — GitHub only exposes stargazers to repo collaborators. Use a{" "}
          <a
            href="https://github.com/settings/tokens?type=beta"
            target="_blank"
            rel="noreferrer noopener"
            className="underline"
          >
            fine-grained PAT
          </a>{" "}
          with <strong>Contents: Read</strong> on this repo, or a classic token with{" "}
          <code className="text-[0.7rem]">repo</code> /{" "}
          <code className="text-[0.7rem]">public_repo</code> scope. Stored in session
          only — never sent to our servers except for this request.
        </p>
      </div>

      <Button type="submit" disabled={loading} className="w-full sm:w-auto">
        {loading ? "Loading…" : "Generate video"}
      </Button>

      <div className="text-sm text-muted-foreground [&_a]:underline">
        Your own repo? Paste <code className="text-xs">owner/repo</code> and a token with
        access. Public repos you don&apos;t own will not work.
      </div>
    </form>
  );
}