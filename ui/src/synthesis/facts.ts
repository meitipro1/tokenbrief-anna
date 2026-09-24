// ui/src/synthesis/facts.ts — ch06 §6.6.1 ids. Null values are sent as "n/a" so the model
// knows the field exists but has no data.
import type { Fact, Metrics, PairsResult, ResolvedToken, RiskFlag, Sourced } from "../types";

const num = (label: string, s: Sourced<number>, unit: Fact["unit"]): Fact =>
  ({ label, value: s.value ?? "n/a", unit, source: s.source, asOf: s.asOf });

const txt = (label: string, value: string | null, source: Fact["source"], asOf: string | null,
  unit: Fact["unit"] = "text"): Fact => ({ label, value: value ?? "n/a", unit, source, asOf });

export function buildFacts(m: Metrics, p: PairsResult | null,
  flags: RiskFlag[]): Record<string, Fact> {
  const top = p?.pairs[0];
  const f: Record<string, Fact> = {
    F1: num("Price (USD)", m.priceUsd, "usd"),
    F2: num("24h change", m.change24hPct, "pct"),
    F3: num("Market cap", m.marketCapUsd, "usd"),
    F4: num("FDV", m.fdvUsd, "usd"),
    F5: num("24h volume", m.volume24hUsd, "usd"),
    F6: num("Liquidity (top pairs)", m.liquidityUsd, "usd"),
    F7: num("Listing age", m.listingAgeDays, "days"),
    F8: num("Market-cap rank", m.rank, "count"),
    F9: num("Change from ATH", m.athChangePct, "pct"),
    F10: p ? { label: "Pairs seen", value: p.totalPairsSeen, unit: "count",
      source: "dexscreener", asOf: p.fetchedAt } : txt("Pairs seen", null, null, null, "count"),
    F11: txt("Top pair", top ? `${top.dexId}/${top.chain}` : null,
      top ? "dexscreener" : null, p?.fetchedAt ?? null),
    F12: txt("Categories", m.categories.join(", ") || null,
      m.cgId ? "coingecko" : null, m.fetchedAt),
    F13: txt("Curated socials", m.socials.curated && (m.socials.website || m.socials.twitter)
      ? "yes" : "no", "derived", m.fetchedAt),
    D1: txt("Description", m.descriptionSnippet,
      m.descriptionSnippet ? "coingecko" : null, m.fetchedAt),
  };
  flags.forEach((fl, i) => {
    f[`F${14 + i}`] = txt(`Flag ${i + 1}`, `${fl.code}:${fl.severity}`, "derived", m.fetchedAt);
  });
  return f;
}

export function factsHeader(r: ResolvedToken): string {
  const t = r.token!;
  return `TOKEN: ${t.symbol} (${t.name}) on ${t.primaryChain ?? "n/a"}. FACTS:`;
}

/**
 * Words the model may legitimately repeat even though they contain digits: the ticker
 * (1INCH, API3), the name and the CoinGecko categories ("Layer 1"). Everything else with a
 * digit must be a placeholder.
 */
export function allowList(m: Metrics): string[] {
  return [m.symbol, m.name, ...m.categories].filter((x) => /\p{Nd}/u.test(x))
    .sort((a, b) => b.length - a.length); // longest first so "Layer 1 (L1)" beats "L1"
}
