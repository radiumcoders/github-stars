"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
}

interface StarParticlesProps {
  active: boolean;
}

export function StarParticles({ active }: StarParticlesProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    const generated = Array.from({ length: 16 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 2,
      delay: Math.random() * 0.4,
    }));
    setParticles(generated);

    const timeout = setTimeout(() => setParticles([]), 2500);
    return () => clearTimeout(timeout);
  }, [active]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, scale: 0, y: 0 }}
            animate={{ opacity: [0, 0.6, 0], scale: [0, 1, 0.3], y: -30 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, delay: p.delay, ease: "easeOut" }}
            className="absolute rounded-full bg-foreground/40"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}