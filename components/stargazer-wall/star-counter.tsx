"use client";

import { useEffect, useRef } from "react";
import { motion, useSpring, useTransform } from "motion/react";
import { Star } from "lucide-react";

interface StarCounterProps {
  value: number;
  className?: string;
}

export function StarCounter({ value, className }: StarCounterProps) {
  const spring = useSpring(0, { stiffness: 60, damping: 20, mass: 0.8 });
  const display = useTransform(spring, (v) => Math.round(v).toLocaleString());
  const prevRef = useRef(0);

  useEffect(() => {
    spring.set(value);
    prevRef.current = value;
  }, [value, spring]);

  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <motion.div
        animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative"
      >
        <Star
          className="size-10 fill-violet-400 text-violet-400 drop-shadow-[0_0_12px_rgba(139,92,246,0.6)]"
          aria-hidden
        />
      </motion.div>
      <motion.span
        className="bg-gradient-to-r from-violet-200 via-indigo-200 to-violet-300 bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-6xl md:text-7xl"
        aria-live="polite"
        aria-label={`${value} stars`}
      >
        <motion.span>{display}</motion.span>
      </motion.span>
    </div>
  );
}