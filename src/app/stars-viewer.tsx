"use client";

import { fetchGithubStars } from "@/app/actions";
import { CompositionPlayer } from "@/app/composition-player";
import { RepositoryForm } from "@/app/repository-form";
import { ResultCard } from "@/app/result-card";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { GithubStarsResult } from "@/lib/github-stars-info";
import { Props } from "@/video/schema";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useCallback, useState } from "react";

export function StarsViewer({ initialRepository }: { initialRepository: string }) {
  const [repository, setRepository] = useState(initialRepository);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GithubStarsResult | null>(null);

  const handleSubmit = useCallback(async (repo: string, token: string) => {
    setRepository(repo);
    setLoading(true);
    setResult(null);
    try {
      const data = await fetchGithubStars(repo, token);
      setResult(data);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-8">
      <RepositoryForm
        initialRepository={repository}
        onSubmit={handleSubmit}
        loading={loading}
      />

      {loading && (
        <ResultCard>
          <div className="flex size-full items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            <div>Fetching stargazers…</div>
          </div>
        </ResultCard>
      )}

      {!loading && result?.ok === false && (
        <ResultCard className="relative">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>
              {result.code === "missing_token"
                ? "Token required"
                : result.code === "forbidden"
                  ? "Access denied"
                  : "Could not load repository"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>{result.message}</p>
            {result.code === "not_found" && (
              <Image
                src="/lost.gif"
                alt=""
                width={198}
                height={187}
                className="absolute bottom-0 left-1/2 -translate-x-1/2"
              />
            )}
          </CardContent>
        </ResultCard>
      )}

      {!loading && result?.ok === true && (
        <ResultCard inputProps={result.data as Partial<Props>}>
          <CompositionPlayer inputProps={result.data} />
        </ResultCard>
      )}
    </div>
  );
}