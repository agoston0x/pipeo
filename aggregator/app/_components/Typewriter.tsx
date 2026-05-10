"use client";

import { useEffect, useState } from "react";

/**
 * Letter-by-letter typewriter that loops through one or more strings:
 *   types phrase → holds → wipes → next phrase → ...
 * Reserves the longest phrase's width invisibly so layout doesn't jump.
 */
export function Typewriter({
  text,
  className = "",
  typeMs = 70,
  holdMs = 4500,
  wipeMs = 30,
  blankMs = 250,
}: {
  text: string | string[];
  className?: string;
  typeMs?: number;
  holdMs?: number;
  wipeMs?: number;
  blankMs?: number;
}) {
  const phrases = Array.isArray(text) ? text : [text];
  const widest = phrases.reduce((a, b) => (b.length > a.length ? b : a), "");
  const [shown, setShown] = useState(phrases[0]);

  useEffect(() => {
    setShown(phrases[0]);
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    async function loop() {
      let idx = 0;
      while (!cancelled) {
        const current = phrases[idx];
        await new Promise((r) => (timer = setTimeout(r, holdMs)));
        if (cancelled) return;
        for (let i = current.length; i >= 0; i--) {
          if (cancelled) return;
          setShown(current.slice(0, i));
          await new Promise((r) => (timer = setTimeout(r, wipeMs)));
        }
        await new Promise((r) => (timer = setTimeout(r, blankMs)));
        idx = (idx + 1) % phrases.length;
        const next = phrases[idx];
        for (let i = 0; i <= next.length; i++) {
          if (cancelled) return;
          setShown(next.slice(0, i));
          await new Promise((r) => (timer = setTimeout(r, typeMs)));
        }
      }
    }
    loop();

    return () => { cancelled = true; clearTimeout(timer); };
  }, [phrases.join("|"), typeMs, holdMs, wipeMs, blankMs]);

  return (
    <span className="relative inline-block align-baseline">
      <span className="invisible">{widest}</span>
      <span className={`absolute left-0 top-0 ${className}`}>{shown}</span>
    </span>
  );
}
