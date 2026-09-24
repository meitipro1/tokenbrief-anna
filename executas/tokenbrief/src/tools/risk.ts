// executas/tokenbrief/src/tools/risk.ts — ch06 §6.5; thresholds only from CONFIG.
// Pure: data in, flags out, no I/O, no clock read (`now` is a parameter).
import { CONFIG, type Config } from "../clients/config.js";
import type { Metrics, PairsResult, RiskCode, RiskFlag, Severity } from "../types.js";

type Skip = { skip: string };
type Rule = (m: Metrics, p: PairsResult | undefined, c: Config, now: number) =>
  RiskFlag | Skip | null;

const DAY = 86_400_000;
const p3 = (x: number) => Number(x.toPrecision(3));
const flag = (code: RiskCode, severity: Severity, message: string, rule: string,
  evidence: RiskFlag["evidence"]): RiskFlag => ({ code, severity, message, rule, evidence });

function sumOf(p: PairsResult, k: "buys24h" | "sells24h" | "volume24hUsd"): number | null {
  const xs = p.pairs.map((x) => x[k]).filter((x): x is number => x !== null);
  return xs.length ? xs.reduce((a, b) => a + b, 0) : null;
}

const freshPair: Rule = (_m, p, c, now) => {
  if (!p?.oldestPairCreatedAt) return { skip: p ? "oldestPairCreatedAt null" : "pairs null" };
  const age = (now - Date.parse(p.oldestPairCreatedAt)) / DAY;
  const ev = { oldestPairAgeDays: p3(age) };
  if (age < c.RISK_FRESH_HIGH_DAYS) return flag("FRESH_PAIR", "high",
    "The first trading pair was created very recently.",
    `oldestPairAgeDays < ${c.RISK_FRESH_HIGH_DAYS}`, ev);
  if (age < c.RISK_FRESH_WARN_DAYS) return flag("FRESH_PAIR", "warn",
    "The first trading pair is recent.", `oldestPairAgeDays < ${c.RISK_FRESH_WARN_DAYS}`, ev);
  return null;
};

const QUOTE: Skip = { skip: "quote asset: DEX liquidity not attributable" };

const lowLiquidity: Rule = (m, p, c) => {
  if (p?.quoteAsset) return QUOTE;
  const liq = m.liquidityUsd.value;
  if (liq === null) return { skip: "liquidityUsd null" };
  if (liq < c.RISK_LIQ_HIGH_USD) return flag("LOW_LIQUIDITY", "high",
    "DEX liquidity is very low, so even small sells can move the price.",
    `liquidityUsd < ${c.RISK_LIQ_HIGH_USD}`, { liquidityUsd: liq });
  if (liq < c.RISK_LIQ_WARN_USD) return flag("LOW_LIQUIDITY", "warn",
    "DEX liquidity is low.", `liquidityUsd < ${c.RISK_LIQ_WARN_USD}`, { liquidityUsd: liq });
  return null;
};

const thinVsCap: Rule = (m, p, c) => {
  if (p?.quoteAsset) return QUOTE;
  const liq = m.liquidityUsd.value;
  const cap = m.marketCapUsd.value;
  if (liq === null || cap === null) {
    return { skip: liq === null ? "liquidityUsd null" : "marketCapUsd null" };
  }
  const ratio = liq / cap;
  return cap > c.RISK_THIN_MIN_CAP_USD && ratio < c.RISK_THIN_RATIO
    ? flag("THIN_VS_CAP", "warn", "Liquidity is thin compared with the market cap.",
      `liquidityUsd / marketCapUsd < ${c.RISK_THIN_RATIO}`,
      { liquidityUsd: liq, marketCapUsd: cap, ratio: p3(ratio) })
    : null;
};

const twinTicker: Rule = (m, _p, c) => {
  const twins = m.twinTickers
    .filter((t) => (t.marketCapUsd ?? 0) >= c.RISK_TWIN_MIN_CAP_USD ||
      (t.rank !== null && t.rank <= c.RISK_TWIN_MAX_RANK))
    .sort((a, b) => (b.marketCapUsd ?? 0) - (a.marketCapUsd ?? 0));
  if (twins.length === 0) return null;
  return flag("TWIN_TICKER", "warn",
    "Other listed coins use the same ticker; check the contract address.",
    `twin cap >= ${c.RISK_TWIN_MIN_CAP_USD} or rank <= ${c.RISK_TWIN_MAX_RANK}`,
    { twins: twins.length, largestTwin: twins[0].name,
      largestTwinCapUsd: twins[0].marketCapUsd });
};

const fdvGap: Rule = (m, _p, c) => {
  const fdv = m.fdvUsd.value;
  const cap = m.marketCapUsd.value;
  if (fdv === null || cap === null) {
    return { skip: fdv === null ? "fdvUsd null" : "marketCapUsd null" };
  }
  const ratio = fdv / cap;
  const ev = { fdvUsd: fdv, marketCapUsd: cap, ratio: p3(ratio) };
  if (ratio > c.RISK_FDV_HIGH) return flag("FDV_MC_GAP", "high",
    "Most of the supply is not circulating yet; unlocks can dilute holders.",
    `fdvUsd / marketCapUsd > ${c.RISK_FDV_HIGH}`, ev);
  if (ratio > c.RISK_FDV_WARN) return flag("FDV_MC_GAP", "warn",
    "A large share of the supply is not circulating yet.",
    `fdvUsd / marketCapUsd > ${c.RISK_FDV_WARN}`, ev);
  return null;
};

const cgUnavailable = (m: Metrics) =>
  m.cgId === null && m.errors.some((e) => e.startsWith("coingecko:"));

const noVerifiedSocials: Rule = (m) => {
  const s = m.socials;
  if (!s.curated && cgUnavailable(m)) return { skip: "curated socials unknown" };
  return !s.curated || (!s.website && !s.twitter)
    ? flag("NO_VERIFIED_SOCIALS", "high",
      "No curated website or X account is on record for this token.",
      "!socials.curated || (!website && !twitter)",
      { curated: String(s.curated), website: s.website, twitter: s.twitter })
    : null;
};

const selfReportedSocials: Rule = (m) => {
  const s = m.socials;
  const links = [s.website, s.twitter, s.telegram, s.discord, s.github].filter(Boolean).length;
  return !s.curated && links > 0
    ? flag("SELF_REPORTED_SOCIALS", "info",
      "The social links shown are self-reported on DexScreener, not curated.",
      "!socials.curated && links >= 1", { links })
    : null;
};

const singlePair: Rule = (_m, p) => {
  if (!p) return { skip: "pairs null" };
  if (p.quoteAsset) return null; // trades mostly as the quote side of many pools
  return p.totalPairsSeen <= 1
    ? flag("SINGLE_PAIR", "warn", "The token trades in a single pool.",
      "totalPairsSeen <= 1", { totalPairsSeen: p.totalPairsSeen })
    : null;
};

const pairConcentration: Rule = (m, p, c) => {
  if (!p) return { skip: "pairs null" };
  if (p.quoteAsset) return null;
  const liq = m.liquidityUsd.value;
  const top = p.pairs[0]?.liquidityUsd ?? null;
  if (p.pairs.length < 2 || !liq || top === null) return null;
  const share = top / liq;
  return share > c.RISK_PAIR_CONC_RATIO
    ? flag("PAIR_CONCENTRATION", "info", "Almost all liquidity sits in one pool.",
      `topPairLiquidity / liquidityUsd > ${c.RISK_PAIR_CONC_RATIO}`,
      { topPairLiquidityUsd: top, liquidityUsd: liq, share: p3(share) })
    : null;
};

const priceSpike: Rule = (m, _p, c) => {
  const ch = m.change24hPct.value;
  if (ch === null) return { skip: "change24hPct null" };
  const ev = { change24hPct: p3(ch) };
  if (Math.abs(ch) > c.RISK_SPIKE_HIGH_PCT) return flag("PRICE_SPIKE", "high",
    "The price moved extremely over the last day.",
    `|change24hPct| > ${c.RISK_SPIKE_HIGH_PCT}`, ev);
  if (Math.abs(ch) > c.RISK_SPIKE_WARN_PCT) return flag("PRICE_SPIKE", "warn",
    "The price moved sharply over the last day.",
    `|change24hPct| > ${c.RISK_SPIKE_WARN_PCT}`, ev);
  return null;
};

// The wash-trading hint compares DEX volume with DEX liquidity (ch03 §3.8: DexScreener
// volume.h24 / liquidity.usd); total CoinGecko volume includes CEX trading and would flag
// every major. The dead-volume branch uses total volume.
const volumeAnomaly: Rule = (m, p, c) => {
  const vol = m.volume24hUsd.value;
  const liq = m.liquidityUsd.value;
  const cap = m.marketCapUsd.value;
  if (vol === null) return { skip: "volume24hUsd null" };
  const dexVol = p && !p.quoteAsset ? sumOf(p, "volume24hUsd") : null;
  if (liq && dexVol !== null && dexVol / liq > c.RISK_VOL_LIQ_RATIO &&
    dexVol > c.RISK_VOL_MIN_USD) {
    return flag("VOLUME_ANOMALY", "warn",
      "Volume is very high relative to liquidity, which can indicate wash trading.",
      `dexVolume24hUsd / liquidityUsd > ${c.RISK_VOL_LIQ_RATIO}`,
      { dexVolume24hUsd: dexVol, liquidityUsd: liq, ratio: p3(dexVol / liq) });
  }
  if (vol < c.RISK_VOL_MIN_USD && cap !== null && cap > c.RISK_VOL_DEAD_CAP_USD) {
    return flag("VOLUME_ANOMALY", "info", "Trading volume is very low for a coin of this size.",
      `volume24hUsd < ${c.RISK_VOL_MIN_USD} && marketCapUsd > ${c.RISK_VOL_DEAD_CAP_USD}`,
      { volume24hUsd: vol, marketCapUsd: cap });
  }
  return null;
};

const noSells: Rule = (_m, p, c) => {
  if (!p) return { skip: "pairs null" };
  const buys = sumOf(p, "buys24h");
  const sells = sumOf(p, "sells24h");
  if (buys === null || sells === null) return { skip: "txns null" };
  return buys >= c.RISK_NO_SELLS_MIN_BUYS && sells === 0
    ? flag("NO_SELLS", "high", "There were buys but no sells over the last day (honeypot hint).",
      `buys24h >= ${c.RISK_NO_SELLS_MIN_BUYS} && sells24h == 0`, { buys24h: buys, sells24h: 0 })
    : null;
};

const sellPressure: Rule = (_m, p, c) => {
  if (!p) return { skip: "pairs null" };
  const buys = sumOf(p, "buys24h") ?? 0;
  const sells = sumOf(p, "sells24h") ?? 0;
  const total = buys + sells;
  return total >= c.RISK_SELL_PRESSURE_MIN_TXNS && sells / total > c.RISK_SELL_PRESSURE_RATIO
    ? flag("SELL_PRESSURE", "info", "Sells clearly outnumber buys over the last day.",
      `sells / txns > ${c.RISK_SELL_PRESSURE_RATIO}`, { buys24h: buys, sells24h: sells })
    : null;
};

// When CoinGecko itself failed, "not listed" cannot be claimed: the rule is skipped and
// shows up as "not checked" in PARTIAL_DATA instead.
const noCgListing: Rule = (m) => {
  if (cgUnavailable(m)) return { skip: "coingecko unavailable" };
  return m.cgId === null
    ? flag("NO_CG_LISTING", "warn", "The token is not listed on CoinGecko.",
      "metrics.cgId == null", { cgId: null })
    : null;
};

export const RULES: Rule[] = [
  freshPair, lowLiquidity, thinVsCap, twinTicker, fdvGap, noVerifiedSocials,
  selfReportedSocials, singlePair, pairConcentration, priceSpike, volumeAnomaly,
  noSells, sellPressure, noCgListing,
];

const ORDER: Record<Severity, number> = { high: 0, warn: 1, info: 2 };

export function riskFlags(
  input: { metrics: Metrics; pairs?: PairsResult | null },
  cfg: Config = CONFIG,
  now: number = Date.now(),
): { flags: RiskFlag[] } {
  const m = input.metrics;
  const p = input.pairs ?? undefined;
  const flags: RiskFlag[] = [];
  const skipped = new Set<string>();
  for (const rule of RULES) {
    const out = rule(m, p, cfg, now);
    if (!out) continue;
    if ("skip" in out) skipped.add(out.skip);
    else flags.push(out);
  }
  if (m.partial || skipped.size > 0) {
    flags.push(flag("PARTIAL_DATA", "info",
      "Some data was unavailable, so some checks were skipped.",
      "metrics.partial || any rule input null",
      { errors: m.errors.join(", ") || null, skipped: [...skipped].join(", ") || null }));
  }
  return { flags: flags.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]) }; // stable
}
