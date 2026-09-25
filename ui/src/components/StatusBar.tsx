import type { Strings } from "../i18n";
import type { Step } from "../run/runBrief";

const ORDER: Step[] = ["resolving", "fetching", "flagging", "synthesizing"];

/** The 4-step progress line (Journey A step 3): resolve → numbers → flags → brief. */
export function StatusBar(p: { s: Strings; step: Step; waitS?: number | null }) {
  const at = ORDER.indexOf(p.step);
  return (
    <div className="space-y-2" role="status" aria-live="polite">
      <ol className="flex gap-1.5">
        {ORDER.map((st, i) => (
          <li key={st} className="flex-1">
            <div className={`h-1.5 rounded-full ${i < at ? "bg-[var(--accent)]"
              : i === at ? "animate-pulse bg-[var(--accent)]" : "bg-[var(--line)]"}`} />
            <span className={`mt-1 block text-[11px] ${i <= at ? "" : "text-[var(--muted)]"}`}>
              {p.s.stepShort[st]}
            </span>
          </li>
        ))}
      </ol>
      <p className="text-sm text-[var(--muted)]">{p.s.steps[p.step]}</p>
      {p.waitS !== null && p.waitS !== undefined && (
        <p className="rounded-lg bg-[var(--warn-bg)] p-2 text-[13px]">{p.s.waiting(p.waitS)}</p>
      )}
    </div>
  );
}
