"use client";

import { useState, useCallback } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_REPO, type StargazerData } from "@/lib/types";
import { parseRepoInput, fetchStargazerData } from "@/lib/stargazers";

interface RepoGeneratorProps {
  onGenerate: (data: StargazerData) => void;
  initialRepo?: string;
}

export function RepoGenerator({ onGenerate, initialRepo = DEFAULT_REPO }: RepoGeneratorProps) {
  const [repoInput, setRepoInput] = useState(initialRepo);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    const parsed = parseRepoInput(repoInput);
    if (!parsed) {
      setError("Enter a valid owner/repo (e.g. vercel/next.js)");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let data: StargazerData;
      try {
        data = await fetchStargazerData(parsed.owner, parsed.repo, "api");
      } catch {
        data = await fetchStargazerData(parsed.owner, parsed.repo, "local");
      }
      onGenerate(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stargazers");
    } finally {
      setLoading(false);
    }
  }, [repoInput, onGenerate]);

  return (
    <Card className="border-white/8 bg-white/3 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="size-5 text-violet-400" />
          Generate Star Wall
        </CardTitle>
        <CardDescription>
          Enter any GitHub repository to animate its stargazer wall.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="repo-input">Repository</Label>
            <Input
              id="repo-input"
              placeholder="owner/repo"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              aria-describedby={error ? "repo-error" : undefined}
              className="border-white/10 bg-white/5"
            />
            {error && (
              <p id="repo-error" className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>
          <Button onClick={handleGenerate} disabled={loading} className="shrink-0">
            {loading ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Sparkles data-icon="inline-start" />
            )}
            {loading ? "Loading…" : "Generate Animation"}
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {["vercel/next.js", "facebook/react", "jal-co/shieldcn"].map((repo) => (
            <Button
              key={repo}
              variant="ghost"
              size="xs"
              onClick={() => setRepoInput(repo)}
              className="text-muted-foreground"
            >
              {repo}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}