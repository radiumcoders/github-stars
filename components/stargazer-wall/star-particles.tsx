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

    const generated = Array.from({ length: 24 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 6 + 3,
      delay: Math.random() * 0.4,
    }));
    setParticles(generated);

    const timeout = setTimeout(() => setParticles([]), 3000);
    return () => clearTimeout(timeout);
  }, [active]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, scale: 0, y: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0.4], y: -40 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, delay: p.delay, ease: "easeOut" }}
            className="absolute rounded-full bg-violet-400"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              boxShadow: "0 0 8px rgba(139, 92, 246, 0.8)",
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}