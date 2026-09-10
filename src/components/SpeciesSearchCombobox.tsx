"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getAllSpecies, getSpecies } from "@/data/pokemon";
import { TypeBadge } from "./TypeBadge";

const MAX_RESULTS = 40;

/** A searchable species picker — a plain <select> with 1000+ options isn't browsable. */
export function SpeciesSearchCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (speciesId: string) => void;
}) {
  const allSpecies = useMemo(() => getAllSpecies(), []);
  const selected = getSpecies(value);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q ? allSpecies.filter((s) => s.name.toLowerCase().includes(q)) : allSpecies;
    return matches.slice(0, MAX_RESULTS);
  }, [query, allSpecies]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function selectSpecies(speciesId: string) {
    onChange(speciesId);
    setQuery("");
    setIsOpen(false);
    inputRef.current?.blur();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) {
      if (event.key === "ArrowDown" || event.key === "Enter") setIsOpen(true);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((i) => Math.min(results.length - 1, i + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((i) => Math.max(0, i - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const pick = results[highlightedIndex];
      if (pick) selectSpecies(pick.id);
    } else if (event.key === "Escape") {
      setIsOpen(false);
      setQuery("");
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls="species-search-listbox"
        aria-autocomplete="list"
        className="w-full rounded border-2 border-panel-ink bg-white px-2 py-1.5 text-panel-ink"
        placeholder={selected.name}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setHighlightedIndex(0);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {isOpen && (
        <ul
          id="species-search-listbox"
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded border-2 border-panel-ink bg-white shadow-[3px_3px_0_rgba(0,0,0,0.3)]"
        >
          {results.length === 0 && <li className="px-2 py-1.5 text-sm text-panel-ink/50">No matches</li>}
          {results.map((s, index) => (
            <li key={s.id} role="option" aria-selected={index === highlightedIndex}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => selectSpecies(s.id)}
                className={`flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-sm text-panel-ink ${
                  index === highlightedIndex ? "bg-gold/30" : ""
                }`}
              >
                <span>{s.name}</span>
                <span className="flex gap-1">
                  {s.types.map((t) => (
                    <TypeBadge key={t} type={t} small />
                  ))}
                </span>
              </button>
            </li>
          ))}
          {allSpecies.length > MAX_RESULTS && results.length === MAX_RESULTS && (
            <li className="px-2 py-1 text-xs text-panel-ink/40">Keep typing to narrow results…</li>
          )}
        </ul>
      )}
    </div>
  );
}
