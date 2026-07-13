"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Loader2 } from "lucide-react";
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
      className="w-full max-w-lg border border-border bg-card"
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
      <div className="border-b border-border px-5 py-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Configuration
        </p>
        <h2 className="mt-1 text-lg font-medium tracking-tight">Generate star video</h2>
      </div>

      <div className="flex flex-col gap-5 p-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="repository">Repository</Label>
          <Input
            id="repository"
            name="repository"
            placeholder="owner/repo"
            className="font-mono"
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
            className="font-mono text-xs"
            autoComplete="off"
            required
            value={token}
            onChange={(event) => setToken(event.target.value)}
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Stargazers require repo access.{" "}
            <a
              href="https://github.com/settings/tokens?type=beta"
              target="_blank"
              rel="noreferrer noopener"
              className="text-foreground underline underline-offset-2"
            >
              Fine-grained PAT
            </a>{" "}
            with <span className="font-mono text-[10px]">Contents: Read</span> — session
            only, never stored server-side.
          </p>
        </div>

        <Button type="submit" disabled={loading} className="w-full font-mono text-xs uppercase tracking-wider">
          {loading ? (
            <>
              <Loader2 className="mr-2 size-3.5 animate-spin" />
              Loading
            </>
          ) : (
            <>
              Generate
              <ArrowRight className="ml-2 size-3.5" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}