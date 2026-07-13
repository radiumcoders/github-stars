"use client";

import { useCallback, useEffect, useState } from "react";
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
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-size-[64px_64px]"
        aria-hidden
      />

      <div className="relative mx-auto flex max-w-5xl flex-col gap-12 px-4 py-16 sm:px-6">
        <header className="flex flex-col gap-3 border-b border-border pb-10">
          <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            GitHub Stars
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Stargazer Wall
          </h1>
          <p className="max-w-lg text-base text-muted-foreground">
            Sequential avatar reveals, star history, and daily updates — built
            with Next.js and GitHub Actions.
          </p>
        </header>

        <RepoGenerator onGenerate={setData} />

        {loading && !data && (
          <div className="flex items-center justify-center py-24">
            <div className="size-5 animate-spin rounded-full border border-border border-t-foreground" />
          </div>
        )}

        {data && (
          <StargazerWall key={`${data.owner}/${data.repo}-${data.updated_at}`} data={data} />
        )}

        {data && <SvgPreview owner={data.owner} repo={data.repo} />}
      </div>

      <Footer />
    </main>
  );
}