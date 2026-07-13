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
      <Star className="size-8 fill-foreground text-foreground" aria-hidden />
      <motion.span
        className="font-mono text-5xl font-medium tracking-tighter text-foreground sm:text-6xl md:text-7xl"
        aria-live="polite"
        aria-label={`${value} stars`}
      >
        <motion.span>{display}</motion.span>
      </motion.span>
    </div>
  );
}