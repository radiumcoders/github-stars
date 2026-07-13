"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseWallAnimationOptions {
  total: number;
  speedMs: number;
  autoPlay?: boolean;
}

export function useWallAnimation({ total, speedMs, autoPlay = false }: UseWallAnimationOptions) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isComplete, setIsComplete] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    setVisibleCount(0);
    setIsComplete(false);
    setIsPlaying(false);
  }, [clearTimer]);

  const showAll = useCallback(() => {
    clearTimer();
    setVisibleCount(total);
    setIsComplete(total > 0);
    setIsPlaying(false);
  }, [clearTimer, total]);

  const play = useCallback(() => {
    if (total === 0) return;
    if (visibleCount >= total) {
      setVisibleCount(0);
      setIsComplete(false);
    }
    setIsPlaying(true);
  }, [total, visibleCount]);

  const pause = useCallback(() => {
    clearTimer();
    setIsPlaying(false);
  }, [clearTimer]);

  const togglePlay = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, pause, play]);

  useEffect(() => {
    clearTimer();

    if (!isPlaying || visibleCount >= total) {
      if (visibleCount >= total && total > 0) {
        setIsComplete(true);
        setIsPlaying(false);
      }
      return;
    }

    timerRef.current = setTimeout(() => {
      setVisibleCount((c) => c + 1);
    }, speedMs);

    return clearTimer;
  }, [isPlaying, visibleCount, total, speedMs, clearTimer]);

  useEffect(() => {
    if (visibleCount > total) setVisibleCount(total);
  }, [total, visibleCount]);

  return {
    visibleCount,
    isPlaying,
    isComplete,
    setIsPlaying,
    reset,
    showAll,
    togglePlay,
    play,
    pause,
  };
}