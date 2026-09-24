import { useState } from "react";
import type { Strings } from "../i18n";

const EXAMPLES: [label: string, query: string][] = [
  ["PEPE", "PEPE"],
  ["0x6982…1933", "0x6982508145454Ce325dDbE47a25d4ec3d2311933"],
  ["DexScreener · WIF", "https://dexscreener.com/solana/EP2ib6dYdEeqD8MfE2ezHCxX3kP3K2eLKkirfPm5eyMx"],
];

export function QueryInput(p: { s: Strings; busy: boolean; value: string;
  onChange: (v: string) => void; onSubmit: (q: string) => void }) {
  const [focus, setFocus] = useState(false);
  return (
    <div className="space-y-2">
      <form className={`flex gap-2 rounded-xl border bg-[var(--card)] p-1.5 ${focus
        ? "border-[var(--accent)]" : "border-[var(--line)]"}`}
        onSubmit={(e) => { e.preventDefault(); if (p.value.trim()) p.onSubmit(p.value); }}>
        <input className="tap min-w-0 flex-1 bg-transparent px-2 text-[15px] outline-none"
          dir="ltr" value={p.value} placeholder={p.s.placeholder} aria-label={p.s.placeholder}
          autoComplete="off" spellCheck={false} onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)} onChange={(e) => p.onChange(e.target.value)} />
        <button type="submit" disabled={p.busy || !p.value.trim()}
          className="tap rounded-lg bg-[var(--accent)] px-5 font-semibold text-[var(--on-accent)]
            disabled:opacity-40">
          {p.s.go}
        </button>
      </form>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-[var(--muted)]">{p.s.examples}:</span>
        {EXAMPLES.map(([label, q]) => (
          <button key={label} type="button" disabled={p.busy}
            className="tap rounded-full border border-[var(--line)] px-3 text-[13px]
              disabled:opacity-40" dir="ltr"
            onClick={() => { p.onChange(q); p.onSubmit(q); }}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
