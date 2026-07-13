"use client";

import { Pause, Play, RotateCcw, FastForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { MAX_SPEED_MS, MIN_SPEED_MS } from "@/lib/types";

interface WallControlsProps {
  isPlaying: boolean;
  speedMs: number;
  visibleCount: number;
  total: number;
  onTogglePlay: () => void;
  onReset: () => void;
  onShowAll: () => void;
  onSpeedChange: (speed: number) => void;
}

export function WallControls({
  isPlaying,
  speedMs,
  visibleCount,
  total,
  onTogglePlay,
  onReset,
  onShowAll,
  onSpeedChange,
}: WallControlsProps) {
  return (
    <div
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
      role="toolbar"
      aria-label="Wall animation controls"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onTogglePlay}
          aria-label={isPlaying ? "Pause animation" : "Play animation"}
          aria-pressed={isPlaying}
        >
          {isPlaying ? <Pause data-icon="inline-start" /> : <Play data-icon="inline-start" />}
          {isPlaying ? "Pause" : "Play"}
        </Button>
        <Button variant="outline" size="sm" onClick={onReset} aria-label="Reset animation">
          <RotateCcw data-icon="inline-start" />
          Reset
        </Button>
        <Button variant="outline" size="sm" onClick={onShowAll} aria-label="Show all avatars">
          <FastForward data-icon="inline-start" />
          Show All
        </Button>
        <span className="font-mono text-sm text-muted-foreground" aria-live="polite">
          {visibleCount} / {total}
        </span>
      </div>

      <div className="flex min-w-[200px] flex-1 items-center gap-3 sm:max-w-xs">
        <Label htmlFor="speed-slider" className="shrink-0 font-mono text-xs text-muted-foreground">
          Speed
        </Label>
        <Slider
          id="speed-slider"
          min={MIN_SPEED_MS}
          max={MAX_SPEED_MS}
          step={10}
          value={[speedMs]}
          onValueChange={(v) => {
            const next = Array.isArray(v) ? v[0] : v;
            if (typeof next === "number") onSpeedChange(next);
          }}
          aria-label={`Animation speed ${speedMs} milliseconds`}
          className="flex-1"
        />
        <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
          {speedMs}ms
        </span>
      </div>
    </div>
  );
}