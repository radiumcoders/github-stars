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
import type { ExportConfig } from "@/lib/export-config";
import type { GithubStarsResult } from "@/lib/github-stars-info";
import { Props } from "@/video/schema";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useCallback, useState } from "react";

export function StarsViewer({
  initialRepository,
  exportConfig,
}: {
  initialRepository: string;
  exportConfig: ExportConfig;
}) {
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
    <div className="flex w-full max-w-2xl flex-col items-center gap-10">
      <RepositoryForm
        initialRepository={repository}
        onSubmit={handleSubmit}
        loading={loading}
      />

      {loading && (
        <ResultCard exportConfig={exportConfig}>
          <div className="flex size-full items-center justify-center gap-2 font-mono text-xs text-neutral-500">
            <Loader2 className="size-3.5 animate-spin" />
            Fetching stargazers
          </div>
        </ResultCard>
      )}

      {!loading && result?.ok === false && (
        <ResultCard className="relative" exportConfig={exportConfig}>
          <CardHeader>
            <CardTitle className="font-mono text-sm uppercase tracking-wider text-neutral-800">
              Error
            </CardTitle>
            <CardDescription className="text-neutral-500">
              {result.code === "missing_token"
                ? "Token required"
                : result.code === "forbidden"
                  ? "Access denied"
                  : "Could not load repository"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-600">{result.message}</p>
            {result.code === "not_found" && (
              <Image
                src="/lost.gif"
                alt=""
                width={198}
                height={187}
                className="absolute bottom-0 left-1/2 -translate-x-1/2 opacity-80"
              />
            )}
          </CardContent>
        </ResultCard>
      )}

      {!loading && result?.ok === true && (
        <ResultCard inputProps={result.data as Partial<Props>} exportConfig={exportConfig}>
          <CompositionPlayer inputProps={result.data} />
        </ResultCard>
      )}
    </div>
  );
}