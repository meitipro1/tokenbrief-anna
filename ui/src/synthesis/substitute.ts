// ui/src/synthesis/substitute.ts — ch06 §6.6.5 placeholder substitution.
// Decision (docs/decisions.md D-6): numbers stay in Latin digits in the Persian view too, so
// they match the sources, the LTR numbers table and the listing copy ("Latin digits kept").
import type { Fact } from "../types";

export type Lang = "en" | "fa";

const nf = (o: Intl.NumberFormatOptions) => new Intl.NumberFormat("en-US", o).format;
const SIG3 = { minimumSignificantDigits: 3, maximumSignificantDigits: 3 };

export function usd(v: number): string {
  const a = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (a >= 1e12) return `${sign}$${nf(SIG3)(a / 1e12)}T`;
  if (a >= 1e9) return `${sign}$${nf(SIG3)(a / 1e9)}B`;
  if (a >= 1e6) return `${sign}$${nf(SIG3)(a / 1e6)}M`;
  if (a >= 1e3) return `${sign}$${nf(SIG3)(a / 1e3)}K`;
  if (a >= 0.01 || a === 0) return `${sign}$${nf(SIG3)(a)}`;
  // sub-cent: up to 8 decimals, subscript-free (0.00001234); keep 3 significant digits when
  // the value is even smaller than that.
  const fixed = nf({ maximumFractionDigits: 8, useGrouping: false })(a);
  return `${sign}$${Number(fixed) === 0 ? nf({ ...SIG3, useGrouping: false })(a) : fixed}`;
}

export function formatFact(f: Pick<Fact, "value" | "unit">, lang: Lang): string {
  if (f.value === null || f.value === "n/a") return lang === "fa" ? "نامشخص" : "n/a";
  if (typeof f.value === "string") return f.value;
  const v = f.value;
  switch (f.unit) {
    case "usd": return usd(v);
    case "pct": return nf({ minimumFractionDigits: 1, maximumFractionDigits: 1,
      signDisplay: "exceptZero" })(v) + "%";
    case "days": return `${nf({ maximumFractionDigits: 0 })(v)} ${lang === "fa" ? "روز" : "days"}`;
    default: return nf({ maximumFractionDigits: 0 })(v);
  }
}

export const substitute = (text: string, facts: Record<string, Fact>, lang: Lang): string =>
  text.replace(/\{(F\d+|D1)\}/g, (m, id: string) => {
    const f = facts[id];
    if (!f) return m;
    if (/^F\d+$/.test(id) && Number(id.slice(1)) >= 14) return flagLabel(f);
    return formatFact(f, lang); // text facts (incl. D1) are inserted as-is
  });

/** F14+ carry "CODE:severity"; render them as readable text ("low liquidity (high)"). */
function flagLabel(f: Fact): string {
  const [code, sev] = String(f.value).split(":");
  return `${code.replace(/_/g, " ").toLowerCase()} (${sev})`;
}
