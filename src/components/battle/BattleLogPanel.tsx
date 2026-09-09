"use client";

import { useEffect, useRef } from "react";

export function BattleLogPanel({ lines }: { lines: string[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  return (
    <div
      ref={scrollRef}
      className="h-40 w-full overflow-y-auto rounded-lg border-[3px] border-panel-ink bg-panel px-4 py-3 font-display text-xs leading-relaxed text-panel-ink shadow-[3px_3px_0_rgba(0,0,0,0.35)]"
    >
      {lines.length === 0 ? (
        <p className="text-panel-ink/40">The battle log will appear here.</p>
      ) : (
        lines.map((line, index) => <p key={index}>{line}</p>)
      )}
    </div>
  );
}
