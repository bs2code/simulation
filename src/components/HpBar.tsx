export function HpBar({ current, max }: { current: number; max: number }) {
  const fraction = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const color = fraction > 0.5 ? "bg-success" : fraction > 0.2 ? "bg-type-electric" : "bg-danger";

  return (
    <div className="flex items-center gap-2">
      <span className="font-display text-[10px] text-panel-muted">HP</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full border border-panel-ink/30 bg-panel-ink/10">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${color}`}
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
      <span className="w-16 shrink-0 text-right font-mono text-xs text-panel-ink/80">
        {current}/{max}
      </span>
    </div>
  );
}
