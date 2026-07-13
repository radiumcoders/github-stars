"use client";

import { fetchGithubStars } from "@/app/actions";
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
import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useState } from "react";

// Remotion must not evaluate during SSR (version registry + DOM APIs).
const CompositionPlayer = dynamic(
  () =>
    import("@/app/composition-player").then((m) => m.CompositionPlayer),
  {
    ssr: false,
    loading: () => (
      <div className="flex size-full items-center justify-center font-mono text-xs text-muted-foreground">
        Loading player…
      </div>
    ),
  },
);

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

  const handleSubmit = useCallback(async (repo: string) => {
    setRepository(repo);
    setLoading(true);
    setResult(null);
    try {
      const data = await fetchGithubStars(repo);
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
          <div className="flex size-full items-center justify-center gap-2 font-mono text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Fetching stargazers
          </div>
        </ResultCard>
      )}

      {!loading && result?.ok === false && (
        <ResultCard className="relative" exportConfig={exportConfig}>
          <CardHeader>
            <CardTitle className="font-mono text-sm uppercase tracking-wider">
              Error
            </CardTitle>
            <CardDescription>
              {result.code === "missing_token"
                ? "GitHub authorization required"
                : result.code === "forbidden"
                  ? "Access denied"
                  : "Could not load repository"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{result.message}</p>
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