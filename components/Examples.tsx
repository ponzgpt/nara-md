"use client";
// Rotating search suggestions: three at a time, next set every 6 s.
// Pauses while hovered or focused, and stays put for people who prefer reduced motion.
import { useEffect, useState } from "react";
import { EXAMPLES } from "@/lib/catalog";

const PER_SET = 3;
const SETS = Math.ceil(EXAMPLES.length / PER_SET);

export function Examples({ onPick }: { onPick: (q: string) => void }) {
  const [set, setSet] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setSet((s) => (s + 1) % SETS), 6000);
    return () => clearInterval(id);
  }, [paused]);

  const shown = EXAMPLES.slice(set * PER_SET, set * PER_SET + PER_SET);
  return (
    <p className="hint" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      Try{" "}
      <span key={set} className="examples">
        {shown.map((ex, i) => (
          <span key={ex}>{i > 0 && " · "}<button type="button" className="example" onClick={() => onPick(ex)}>{ex}</button></span>
        ))}
      </span>
    </p>
  );
}
