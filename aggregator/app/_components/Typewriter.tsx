"use client";

import { useEffect, useState } from "react";

/**
 * Letter-by-letter typewriter that loops:
 *   types `text` → holds → wipes → re-types → ...
 * Reserves the full text width invisibly so layout doesn't jump.
 */
export function Typewriter({
  text,
  className = "",
  typeMs = 70,
  holdMs = 1800,
  wipeMs = 30,
  blankMs = 400,
}: {
  text: string;
  className?: string;
  typeMs?: number;
  holdMs?: number;
  wipeMs?: number;
  blankMs?: number;
}) {
  const [shown, setShown] = useState(text);

  useEffect(() => {
    setShown(text); // initial render shows full
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    async function loop() {
      while (!cancelled) {
        // hold
        await new Promise((r) => (timer = setTimeout(r, holdMs)));
        if (cancelled) return;
        // wipe (fast)
        for (let i = text.length; i >= 0; i--) {
          if (cancelled) return;
          setShown(text.slice(0, i));
          await new Promise((r) => (timer = setTimeout(r, wipeMs)));
        }
        // blank pause
        await new Promise((r) => (timer = setTimeout(r, blankMs)));
        // type
        for (let i = 0; i <= text.length; i++) {
          if (cancelled) return;
          setShown(text.slice(0, i));
          await new Promise((r) => (timer = setTimeout(r, typeMs)));
        }
      }
    }
    loop();

    return () => { cancelled = true; clearTimeout(timer); };
  }, [text, typeMs, holdMs, wipeMs, blankMs]);

  return (
    <span className="relative inline-block align-baseline">
      <span className="invisible">{text}</span>
      <span className={`absolute left-0 top-0 ${className}`}>
        {shown}
        <span className="typewriter-caret">▋</span>
      </span>
    </span>
  );
}
