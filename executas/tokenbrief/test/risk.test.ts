// executas/tokenbrief/test/risk.test.ts — ch06 §6.5 table test. The factories build a "clean
// blue chip" that fires nothing; each case overrides what one rule reads and asserts the exact
// set of CODE:severity values (catches rules firing when they should not, and vice versa).
import { describe, expect, it } from "vitest";
import { CONFIG } from "../src/clients/config.js";
import { riskFlags } from "../src/tools/risk.js";
import type { Candidate, Metrics, Pair, PairsResult, Sourced } from "../src/types.js";

const NOW = Date.parse("2026-09-25T12:00:00Z");
const ago = (days: number) => new Date(NOW - days * 86_400_000).toISOString();
const s = (value: number | null): Sourced<number> =>
  value === null ? { value, source: null, asOf: null }
    : { value, source: "coingecko", asOf: "2026-09-25T12:00:00Z" };
const twin = (marketCapUsd: number | null, rank: number | null): Candidate =>
  ({ cgId: "twin", symbol: "BLUE", name: "Blue Twin", marketCapUsd, rank, contracts: {} });

function makeMetrics(o: Partial<Metrics> = {}): Metrics {
  return {
    cgId: "blue", symbol: "BLUE", name: "Blue Chip",
    priceUsd: s(1), change24hPct: s(2), marketCapUsd: s(5e9), fdvUsd: s(6e9),
    volume24hUsd: s(2e8), liquidityUsd: s(1e8), holders: s(null),
    circulatingSupply: s(5e9), totalSupply: s(6e9), maxSupply: s(null),
    athUsd: s(2), athChangePct: s(-50), listingAgeDays: s(1500), rank: s(40),
    categories: ["Layer 1"], descriptionSnippet: "A blue chip.",
    socials: { website: "https://blue.example", twitter: "blue", telegram: null, discord: null,
      github: null, curated: true },
    twinTickers: [], fetchedAt: "2026-09-25T12:00:00Z", partial: false, errors: [], ...o,
  };
}

function makePair(o: Partial<Pair> = {}): Pair {
  return {
    chain: "ethereum", dexId: "uniswap", pairAddress: "0xa", url: "https://dexscreener.com/x",
    baseSymbol: "BLUE", quoteSymbol: "WETH", priceUsd: 1, liquidityUsd: 6e7, volume24hUsd: 1e8,
    buys24h: 250, sells24h: 240, priceChange24hPct: 2, pairCreatedAt: ago(900), ...o,
  };
}

function makePairs(o: Partial<PairsResult> = {}, pairs?: Pair[]): PairsResult {
  return {
    pairs: pairs ?? [makePair(), makePair({ pairAddress: "0xb", liquidityUsd: 4e7 })],
    totalPairsSeen: 12, oldestPairCreatedAt: ago(900), fetchedAt: "2026-09-25T12:00:00Z",
    source: "dexscreener", ...o,
  };
}

const two = (a: number, b: number, extra: Partial<Pair> = {}) =>
  makePairs({}, [makePair({ liquidityUsd: a, volume24hUsd: a, ...extra }),
    makePair({ pairAddress: "0xb", liquidityUsd: b, volume24hUsd: b, ...extra })]);
const SMALL = { marketCapUsd: s(9e5), fdvUsd: s(9e5), volume24hUsd: s(5e4) };
const DS_SOCIALS = { website: null, twitter: null, telegram: "https://t.me/blue", discord: null,
  github: null, curated: false };

const CASES: [string, Partial<Metrics>, PairsResult | undefined, string[]][] = [
  ["clean blue chip", {}, makePairs(), []],
  ["fresh pair < 7 d", {}, makePairs({ oldestPairCreatedAt: ago(3) }), ["FRESH_PAIR:high"]],
  ["pair 7–30 d", {}, makePairs({ oldestPairCreatedAt: ago(10) }), ["FRESH_PAIR:warn"]],
  ["pair exactly 30 d does not fire", {}, makePairs({ oldestPairCreatedAt: ago(30) }), []],
  ["liquidity < 50k", { ...SMALL, liquidityUsd: s(3e4) }, two(2e4, 1e4), ["LOW_LIQUIDITY:high"]],
  ["liquidity < 250k", { ...SMALL, liquidityUsd: s(1e5) }, two(6e4, 4e4), ["LOW_LIQUIDITY:warn"]],
  ["thin vs cap", { liquidityUsd: s(4e6), marketCapUsd: s(5e8), fdvUsd: s(5e8),
    volume24hUsd: s(2e7) }, two(2.5e6, 1.5e6), ["THIN_VS_CAP:warn"]],
  ["thin ratio exactly 0.01 does not fire", { liquidityUsd: s(5e6), marketCapUsd: s(5e8),
    fdvUsd: s(5e8), volume24hUsd: s(2e7) }, two(3e6, 2e6), []],
  ["twin by cap", { twinTickers: [twin(2e6, null)] }, makePairs(), ["TWIN_TICKER:warn"]],
  ["twin by rank", { twinTickers: [twin(null, 1500)] }, makePairs(), ["TWIN_TICKER:warn"]],
  ["small twin ignored", { twinTickers: [twin(5e5, 3000)] }, makePairs(), []],
  ["fdv gap > 10x", { fdvUsd: s(6e10) }, makePairs(), ["FDV_MC_GAP:high"]],
  ["fdv gap 3–10x", { fdvUsd: s(2e10) }, makePairs(), ["FDV_MC_GAP:warn"]],
  ["curated but no website or X", { socials: { website: null, twitter: null, telegram: "blue",
    discord: null, github: null, curated: true } }, makePairs(), ["NO_VERIFIED_SOCIALS:high"]],
  ["self-reported socials only", { socials: DS_SOCIALS }, makePairs(),
    ["NO_VERIFIED_SOCIALS:high", "SELF_REPORTED_SOCIALS:info"]],
  ["single pool", {}, makePairs({ totalPairsSeen: 1 }, [makePair({ liquidityUsd: 1e8 })]),
    ["SINGLE_PAIR:warn"]],
  ["concentration exactly 0.9 does not fire", {}, two(9e7, 1e7), []],
  ["concentration 0.95", {}, two(9.5e7, 5e6), ["PAIR_CONCENTRATION:info"]],
  ["spike > 150%", { change24hPct: s(200) }, makePairs(), ["PRICE_SPIKE:high"]],
  ["spike 50–150%", { change24hPct: s(-80) }, makePairs(), ["PRICE_SPIKE:warn"]],
  ["wash-trading shape (DEX volume vs DEX liquidity)", {},
    two(6e7, 4e7, { volume24hUsd: 1.5e9 }), ["VOLUME_ANOMALY:warn"]],
  ["CEX-heavy total volume does not look like wash trading", { volume24hUsd: s(3e10) },
    makePairs(), []],
  ["quote asset (USDT-style): liquidity rules skip, no single-pair flag",
    { liquidityUsd: s(null), marketCapUsd: s(1.8e11), fdvUsd: s(1.8e11) },
    makePairs({ quoteAsset: true, totalPairsSeen: 1 }, [makePair({ liquidityUsd: 900 })]),
    ["PARTIAL_DATA:info"]],
  ["dead volume on a big cap", { volume24hUsd: s(5000) }, makePairs(), ["VOLUME_ANOMALY:info"]],
  ["19 buys, 0 sells: no", {}, makePairs({}, [makePair({ buys24h: 10, sells24h: 0 }),
    makePair({ pairAddress: "0xb", liquidityUsd: 4e7, buys24h: 9, sells24h: 0 })]), []],
  ["20 buys, 0 sells: honeypot hint", {}, two(6e7, 4e7, { buys24h: 10, sells24h: 0 }),
    ["NO_SELLS:high"]],
  ["sell pressure", {}, two(6e7, 4e7, { buys24h: 10, sells24h: 30 }), ["SELL_PRESSURE:info"]],
  ["not on CoinGecko", { cgId: null }, makePairs(), ["NO_CG_LISTING:warn"]],
  ["CoinGecko down: listing and curated socials are not claimed",
    { cgId: null, socials: DS_SOCIALS, partial: true, errors: ["coingecko:429"] }, makePairs(),
    ["SELF_REPORTED_SOCIALS:info", "PARTIAL_DATA:info"]],
  ["partial upstream data", { change24hPct: s(null), partial: true, errors: ["coingecko:429"] },
    makePairs(), ["PARTIAL_DATA:info"]],
  ["null market cap suppresses ratio rules", { marketCapUsd: s(null), fdvUsd: s(6e10) },
    makePairs(), ["PARTIAL_DATA:info"]],
  ["no pairs at all (BTC-style)", {}, undefined, ["PARTIAL_DATA:info"]],
];

describe("risk_flags (ch06 §6.5)", () => {
  it.each(CASES)("%s", (_name, m, p, expected) => {
    const got = riskFlags({ metrics: makeMetrics(m), pairs: p }, CONFIG, NOW).flags
      .map((f) => `${f.code}:${f.severity}`);
    expect(got.sort()).toEqual([...expected].sort());
  });

  it("records skipped rules in PARTIAL_DATA evidence", () => {
    const { flags } = riskFlags({ metrics: makeMetrics({ change24hPct: s(null) }),
      pairs: makePairs() }, CONFIG, NOW);
    expect(flags[0].evidence.skipped).toContain("change24hPct null");
  });

  it("evidence carries the exact compared numbers", () => {
    const { flags } = riskFlags({ metrics: makeMetrics({ ...SMALL, liquidityUsd: s(38_410) }),
      pairs: two(2e4, 18_410) }, CONFIG, NOW);
    const low = flags.find((f) => f.code === "LOW_LIQUIDITY")!;
    expect(low.evidence.liquidityUsd).toBe(38_410);
    expect(low.rule).toBe(`liquidityUsd < ${CONFIG.RISK_LIQ_HIGH_USD}`);
  });

  it("never puts digits in messages and sorts high → warn → info", () => {
    const worst = makeMetrics({
      cgId: null, liquidityUsd: s(1000), marketCapUsd: s(5e7), fdvUsd: s(1e9),
      change24hPct: s(300), volume24hUsd: s(1e6), partial: true, errors: ["dexscreener:500"],
      twinTickers: [twin(1e9, 50)], socials: { ...DS_SOCIALS, telegram: "https://t.me/x" },
    });
    const pairs = makePairs({ totalPairsSeen: 1, oldestPairCreatedAt: ago(1) },
      [makePair({ liquidityUsd: 1000, buys24h: 40, sells24h: 0 })]);
    const { flags } = riskFlags({ metrics: worst, pairs }, CONFIG, NOW);
    expect(flags.length).toBeGreaterThan(8);
    for (const f of flags) expect(f.message).not.toMatch(/\p{Nd}/u);
    const rank = { high: 0, warn: 1, info: 2 };
    const order = flags.map((f) => rank[f.severity]);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
});
