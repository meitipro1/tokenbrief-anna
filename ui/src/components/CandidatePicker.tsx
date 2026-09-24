import type { Strings } from "../i18n";
import { formatFact } from "../synthesis/substitute";
import type { Candidate } from "../types";

/** "Which ARB?" — name, symbol, market cap and rank; full-width 44px rows. */
export function CandidatePicker(p: { s: Strings; symbol: string; candidates: Candidate[];
  onPick: (c: Candidate) => void; onCancel: () => void }) {
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--card)]">
      <h2 className="border-b border-[var(--line)] px-3 py-2.5 font-semibold">
        {p.s.pick(p.symbol)}
      </h2>
      <ul>
        {p.candidates.map((c) => (
          <li key={c.cgId ?? c.name} className="border-b border-[var(--line)] last:border-0">
            <button type="button" className="tap flex w-full items-center justify-between gap-3
              px-3 py-2 text-start" onClick={() => p.onPick(c)}>
              <span className="min-w-0">
                <span className="block truncate font-medium">{c.name}</span>
                <span className="text-[13px] text-[var(--muted)]" dir="ltr">
                  {c.symbol}{c.cgId ? ` · ${c.cgId}` : ""}
                </span>
              </span>
              <span className="shrink-0 text-end text-[13px]" dir="ltr">
                <span className="block font-mono">
                  {formatFact({ value: c.marketCapUsd, unit: "usd" }, "en")}
                </span>
                <span className="text-[var(--muted)]">{p.s.rank} {c.rank ?? "n/a"}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="p-2">
        <button type="button" className="tap w-full rounded-lg border border-[var(--line)]"
          onClick={p.onCancel}>{p.s.cancel}</button>
      </div>
    </section>
  );
}
