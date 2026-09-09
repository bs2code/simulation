import Link from "next/link";

const STEPS = [
  { href: "/teams", title: "Build your teams", body: "Choose species, levels, natures, abilities, items, and movesets for Team A and Team B." },
  { href: "/battle", title: "Battle turn by turn", body: "Play out a battle move by move, with switches, mechanics, and a full battle log." },
  { href: "/simulate", title: "Simulate at scale", body: "Let AI play both sides — once, or a hundred times — and see win rates, MVPs, and replays." },
] as const;

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-4 py-12 sm:px-6 sm:py-16">
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl leading-snug text-ink sm:text-4xl">
          A turn-based Pokémon battle engine, built from the ground up.
        </h1>
        <p className="mt-4 text-ink-muted">
          Real type matchups, stat stages, status conditions, abilities, held items, weather,
          Mega Evolution, Z-Moves, Gigantamax, and three tiers of AI opponent — all resolved by a
          proper turn engine, not a strength score.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <Link
            key={step.href}
            href={step.href}
            className="flex flex-col gap-2 rounded-lg border-[3px] border-panel-ink bg-panel p-5 text-panel-ink shadow-[3px_3px_0_rgba(0,0,0,0.3)] transition-transform hover:-translate-y-1"
          >
            <span className="font-display text-xs text-panel-ink/50">{index + 1}</span>
            <span className="font-display text-base">{step.title}</span>
            <span className="text-sm text-panel-ink/70">{step.body}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
