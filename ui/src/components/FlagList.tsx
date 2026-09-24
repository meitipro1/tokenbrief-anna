import { useState } from "react";
import type { Strings } from "../i18n";
import type { RiskFlag } from "../types";

const TONE = {
  high: "border-[var(--high)] bg-[var(--high-bg)]",
  warn: "border-[var(--warn)] bg-[var(--warn-bg)]",
  info: "border-[var(--line)] bg-[var(--card)]",
};

const fmt = (v: number | string | null) =>
  typeof v === "number" ? v.toLocaleString("en-US", { maximumFractionDigits: 4 }) : String(v ?? "n/a");

/**
 * The code's flag list (never the model's). "Why?" is a button, not a hover, and shows the
 * rule and the exact numbers it compared. NO_SELLS + SINGLE_PAIR + FRESH_PAIR together are
 * labelled "exit-liquidity risk", nothing stronger (§6.5).
 */
export function FlagList(p: { s: Strings; flags: RiskFlag[] }) {
  const codes = new Set(p.flags.map((f) => f.code));
  const exitRisk = codes.has("NO_SELLS") && codes.has("SINGLE_PAIR") && codes.has("FRESH_PAIR");
  if (p.flags.length === 0) {
    return <p className="rounded-lg border border-[var(--line)] p-3 text-sm">{p.s.noFlags}</p>;
  }
  return (
    <ul className="space-y-2">
      {exitRisk && (
        <li className={`rounded-lg border-2 p-3 text-sm font-semibold ${TONE.high}`}>
          {p.s.exitRisk}
        </li>
      )}
      {p.flags.map((f) => <FlagItem key={f.code + f.severity} s={p.s} flag={f} />)}
    </ul>
  );
}

function FlagItem(p: { s: Strings; flag: RiskFlag }) {
  const [open, setOpen] = useState(false);
  const f = p.flag;
  const skipped = f.code === "PARTIAL_DATA" ? f.evidence.skipped : null;
  return (
    <li className={`rounded-lg border p-3 ${TONE[f.severity]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0" dir="ltr">
          <span className="me-2 inline-block rounded px-1.5 py-0.5 font-mono text-[11px]
            font-semibold uppercase tracking-wide ring-1 ring-current">{p.s.severity[f.severity]}</span>
          <span className="font-mono text-[12px] font-semibold">{f.code}</span>
          <p className="mt-1 text-[14px]" dir="auto">
            {p.s.flagMessages[`${f.code}:${f.severity}`] ?? f.message}
          </p>
          {skipped ? <p className="mt-1 text-[13px] text-[var(--muted)]">
            {p.s.notChecked}: {String(skipped)}</p> : null}
        </div>
        <button type="button" className="tap shrink-0 rounded-md border border-[var(--line)] px-2
          text-[13px]" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? p.s.hideWhy : p.s.why}
        </button>
      </div>
      {open && (
        <dl className="mt-2 space-y-1 border-t border-[var(--line)] pt-2 text-[13px]" dir="ltr">
          <div><dt className="inline text-[var(--muted)]">{p.s.rule}: </dt>
            <dd className="inline font-mono">{f.rule}</dd></div>
          {Object.entries(f.evidence).map(([k, v]) => (
            <div key={k}><dt className="inline text-[var(--muted)]">{k}: </dt>
              <dd className="inline break-all font-mono">{fmt(v)}</dd></div>
          ))}
        </dl>
      )}
    </li>
  );
}
