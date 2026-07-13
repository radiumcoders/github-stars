"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutGroup, motion } from "motion/react";
import { Search } from "lucide-react";
import type { StargazerData } from "@/lib/types";
import { DEFAULT_SPEED_MS } from "@/lib/types";
import { filterStargazers } from "@/lib/stargazers";
import { useWallAnimation } from "@/hooks/use-wall-animation";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StarCounter } from "./star-counter";
import { AvatarCard } from "./avatar-card";
import { WallControls } from "./wall-controls";
import { StarParticles } from "./star-particles";
import { ExportButton } from "./export-button";

interface StargazerWallProps {
  data: StargazerData;
  autoPlay?: boolean;
}

export function StargazerWall({ data, autoPlay = true }: StargazerWallProps) {
  const [search, setSearch] = useState("");
  const [speedMs, setSpeedMs] = useState(DEFAULT_SPEED_MS);
  const [animationKey, setAnimationKey] = useState(0);

  const filtered = useMemo(
    () => filterStargazers(data.stargazers, search),
    [data.stargazers, search],
  );

  const { visibleCount, isPlaying, isComplete, togglePlay, reset, showAll } =
    useWallAnimation({
      total: filtered.length,
      speedMs,
      autoPlay: autoPlay && !search,
    });

  const visibleStargazers = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );

  const counterValue = useMemo(() => {
    if (search) return visibleCount;
    const ratio = filtered.length > 0 ? visibleCount / filtered.length : 0;
    return Math.round(data.total_stars * ratio) || visibleCount;
  }, [search, visibleCount, filtered.length, data.total_stars]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setAnimationKey((k) => k + 1);
  }, []);

  const handleReset = useCallback(() => {
    reset();
    setAnimationKey((k) => k + 1);
  }, [reset]);

  useEffect(() => {
    if (search) {
      reset();
    }
  }, [search, reset]);

  return (
    <section
      id="stargazer-wall"
      className="relative flex flex-col gap-6"
      aria-label={`Stargazer wall for ${data.owner}/${data.repo}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              <a
                href={`https://github.com/${data.owner}/${data.repo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground transition-colors hover:text-muted-foreground"
              >
                {data.owner}/{data.repo}
              </a>
            </h2>
            <Badge variant="outline" className="font-mono text-xs">
              {data.stargazers.length} on wall
            </Badge>
          </div>
          <StarCounter value={counterValue} />
        </div>

        <div className="flex items-center gap-2">
          <ExportButton targetId="wall-canvas" />
        </div>
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          placeholder="Filter by username…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="border-border bg-background pl-9 font-mono text-sm"
          aria-label="Filter stargazers by username"
        />
      </div>

      <WallControls
        isPlaying={isPlaying}
        speedMs={speedMs}
        visibleCount={visibleCount}
        total={filtered.length}
        onTogglePlay={togglePlay}
        onReset={handleReset}
        onShowAll={showAll}
        onSpeedChange={setSpeedMs}
      />

      <div
        id="wall-canvas"
        className="relative overflow-hidden rounded-lg border border-border bg-card p-6 sm:p-8"
      >
        <StarParticles active={isComplete && !search} />

        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-card to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-card to-transparent" />

        <LayoutGroup id={`wall-${animationKey}`}>
          <motion.div
            layout
            className="grid grid-cols-4 gap-4 sm:grid-cols-6 md:grid-cols-8 md:gap-5"
            role="list"
            aria-label="Stargazer avatars"
          >
            {visibleStargazers.map((stargazer, index) => (
              <div key={stargazer.login} role="listitem">
                <AvatarCard stargazer={stargazer} index={index} />
              </div>
            ))}
          </motion.div>
        </LayoutGroup>

        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No stargazers match your search.
          </p>
        )}

        {visibleCount === 0 && filtered.length > 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Press Play to reveal stargazers one by one.
          </p>
        )}
      </div>
    </section>
  );
}