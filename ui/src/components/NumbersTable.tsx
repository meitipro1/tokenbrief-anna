import type { Lang, Strings } from "../i18n";
import { formatFact } from "../synthesis/substitute";
import type { Brief } from "../types";

const ROWS = ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11"];

const hhmm = (iso: string | null) => (iso ? `${iso.slice(11, 16)} UTC` : "");

/** Key numbers: rendered from FACTS only (code, never prose). Always LTR, Latin digits; the
 * few words in values ("days", "n/a") follow the UI language like the labels do. */
export function NumbersTable(p: { s: Strings; brief: Brief; lang: Lang }) {
  const f = p.brief.facts;
  return (
    <table className="w-full text-[14px]" dir="ltr">
      <tbody>
        {ROWS.filter((id) => f[id]).map((id) => (
          <tr key={id} className="border-b border-[var(--line)] last:border-0">
            <td className="py-2 pe-2 text-[var(--muted)]">{p.s.labels[id] ?? f[id].label}</td>
            <td className={`py-2 text-end font-mono ${id === "F2" ? trend(f[id].value) : ""}`}>
              {formatFact(f[id], p.lang)}
            </td>
            <td className="w-[88px] py-2 ps-2 text-end text-[11px] text-[var(--muted)]"
              title={f[id].asOf ?? ""}>
              {f[id].source ? `${f[id].source}` : ""}
              {f[id].asOf ? <span className="block">{hhmm(f[id].asOf)}</span> : null}
            </td>
          </tr>
        ))}
        <tr>
          <td className="py-2 pe-2 text-[var(--muted)]">{p.s.holders}</td>
          <td className="py-2 text-end text-[13px] text-[var(--muted)]" colSpan={2}>
            {p.s.holdersNa}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function trend(v: unknown): string {
  return typeof v === "number" ? (v < 0 ? "text-[var(--down)]" : v > 0 ? "text-[var(--up)]" : "")
    : "";
}
