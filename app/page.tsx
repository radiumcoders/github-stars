"use client";

import { useCallback, useEffect, useState } from "react";
import { Stars } from "lucide-react";
import { StargazerWall } from "@/components/stargazer-wall/stargazer-wall";
import { RepoGenerator } from "@/components/repo-generator";
import { SvgPreview } from "@/components/svg-preview";
import { Footer } from "@/components/footer";
import { DEFAULT_REPO, type StargazerData } from "@/lib/types";
import { parseRepoInput, fetchStargazerData } from "@/lib/stargazers";

export default function HomePage() {
  const [data, setData] = useState<StargazerData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDefault = useCallback(async () => {
    const parsed = parseRepoInput(DEFAULT_REPO);
    if (!parsed) return;

    setLoading(true);
    try {
      const result = await fetchStargazerData(parsed.owner, parsed.repo, "local");
      setData(result);
    } catch {
      try {
        const result = await fetchStargazerData(parsed.owner, parsed.repo, "api");
        setData(result);
      } catch {
        /* handled by empty state */
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDefault();
  }, [loadDefault]);

  return (
    <main className="relative min-h-full flex-1">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 left-1/2 size-[600px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute top-1/3 -right-32 size-[400px] rounded-full bg-indigo-600/8 blur-[100px]" />
        <div className="absolute bottom-0 -left-32 size-[350px] rounded-full bg-purple-600/6 blur-[90px]" />
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6 sm:py-16">
        <header className="flex flex-col gap-4 text-center sm:text-left">
          <div className="inline-flex items-center justify-center gap-2 self-center rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-300 sm:self-start">
            <Stars className="size-4" />
            Stargazer Avatar Wall
          </div>
          <h1 className="bg-gradient-to-br from-white via-violet-100 to-indigo-200 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
            Watch your stars come alive
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
            A premium animated stargazer wall with sequential slider reveals,
            star history charts, and daily GitHub Action updates.
          </p>
        </header>

        <RepoGenerator onGenerate={setData} />

        {loading && !data && (
          <div className="flex items-center justify-center py-24">
            <div className="size-8 animate-spin rounded-full border-2 border-violet-500/30 border-t-violet-400" />
          </div>
        )}

        {data && <StargazerWall key={`${data.owner}/${data.repo}-${data.updated_at}`} data={data} />}

        {data && <SvgPreview owner={data.owner} repo={data.repo} />}
      </div>

      <Footer />
    </main>
  );
}