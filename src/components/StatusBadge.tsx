import type { NonVolatileStatus } from "@/types/pokemon";

const STATUS_STYLE: Record<Exclude<NonVolatileStatus, "none">, { label: string; className: string }> = {
  burn: { label: "BRN", className: "bg-type-fire text-panel-ink" },
  freeze: { label: "FRZ", className: "bg-type-ice text-panel-ink" },
  paralysis: { label: "PAR", className: "bg-type-electric text-panel-ink" },
  poison: { label: "PSN", className: "bg-type-poison text-panel" },
  "badly-poisoned": { label: "PSN", className: "bg-type-poison text-panel" },
  sleep: { label: "SLP", className: "bg-panel-muted text-panel-ink" },
};

export function StatusBadge({ status }: { status: NonVolatileStatus }) {
  if (status === "none") return null;
  const style = STATUS_STYLE[status];
  return (
    <span className={`rounded px-1.5 py-0.5 font-display text-[10px] tracking-wide ${style.className}`}>
      {style.label}
    </span>
  );
}
