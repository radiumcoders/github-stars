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
      whileHover={{ y: -4, scale: 1.05 }}
      className={cn(
        "group relative flex flex-col items-center gap-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      aria-label={`${stargazer.login}, starred on ${starredDate}`}
      tabIndex={0}
    >
      <Avatar className="size-14 border border-border transition-colors duration-200 group-hover:border-foreground/40 sm:size-16 md:size-[4.5rem]">
        <AvatarImage
          src={stargazer.avatar_url}
          alt=""
          loading="lazy"
          className="object-cover"
        />
        <AvatarFallback className="bg-muted font-mono text-xs text-muted-foreground">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-background/90 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
        <span className="max-w-[5.5rem] truncate font-mono text-xs text-foreground">
          {stargazer.login}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">{starredDate}</span>
      </div>
    </motion.a>
  );
});