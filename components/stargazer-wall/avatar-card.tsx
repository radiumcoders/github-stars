"use client";

import { memo } from "react";
import { motion } from "motion/react";
import { format } from "date-fns";
import type { Stargazer } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AvatarCardProps {
  stargazer: Stargazer;
  index: number;
  className?: string;
}

export const AvatarCard = memo(function AvatarCard({
  stargazer,
  index,
  className,
}: AvatarCardProps) {
  const initials = stargazer.login.slice(0, 2).toUpperCase();
  const starredDate = format(new Date(stargazer.starred_at), "MMM d, yyyy");

  return (
    <motion.a
      layout
      layoutId={`avatar-${stargazer.login}`}
      href={stargazer.html_url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, x: 72, scale: 0.75 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 380,
        damping: 28,
        mass: 0.6,
        delay: index * 0.02,
      }}
      whileHover={{ y: -6, scale: 1.08 }}
      className={cn(
        "group relative flex flex-col items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
        className,
      )}
      aria-label={`${stargazer.login}, starred on ${starredDate}`}
      tabIndex={0}
    >
      <div className="relative">
        <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-indigo-500/40 via-violet-500/30 to-purple-500/40 opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100" />
        <Avatar className="size-14 border-2 border-violet-500/30 shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-shadow duration-300 group-hover:border-violet-400/60 group-hover:shadow-[0_0_28px_rgba(139,92,246,0.35)] sm:size-16 md:size-[4.5rem]">
          <AvatarImage
            src={stargazer.avatar_url}
            alt=""
            loading="lazy"
            className="object-cover"
          />
          <AvatarFallback className="bg-zinc-800 text-xs text-violet-200">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-zinc-950/80 opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
        <span className="max-w-[5.5rem] truncate text-xs font-medium text-violet-100">
          {stargazer.login}
        </span>
        <span className="text-[10px] text-zinc-400">{starredDate}</span>
      </div>
    </motion.a>
  );
});