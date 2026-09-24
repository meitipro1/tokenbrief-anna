// executas/tokenbrief/test/metrics.test.ts — P-9.5: field assembly, sources, pair selection,
// partial data.
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchMetrics, snippet } from "../src/tools/metrics.js";
import { fetchPairs } from "../src/tools/pairs.js";
import { cgCoin, dsPair, routeFetch } from "./helpers.js";

afterEach(() => vi.unstubAllGlobals());

const ADDR = `0x${"1".repeat(40)}`;
const liq = (usd: number, i: number, o: Record<string, unknown> = {}) =>
  dsPair({ pairAddress: `0xp${i}`, liquidity: { usd: String(usd) }, ...o });

describe("fetch_pairs (ch06 §6.4.3)", () => {
  it("keeps the top five by liquidity, drops dust, counts all pairs seen", async () => {
    routeFetch([["/token-pairs/v1/ethereum/", [
      liq(5e5, 1), liq(9e5, 2), liq(500, 3, { pairCreatedAt: Date.parse("2020-01-01") }),
      liq(3e5, 4), liq(7e5, 5), liq(1e5, 6), liq(2e5, 7), liq(9e5, 2),
      dsPair({ pairAddress: "0xq", baseToken: { address: "0xother", name: "W", symbol: "W" } }),
    ]]]);
    const r = await fetchPairs({ chain: "ethereum", address: ADDR });
    expect(r.pairs.map((p) => p.pairAddress)).toEqual(["0xp2", "0xp5", "0xp1", "0xp4", "0xp7"]);
    expect(r.totalPairsSeen).toBe(8); // quote-side pool excluded, dust counted
    expect(r.oldestPairCreatedAt).toBe("2020-01-01T00:00:00.000Z"); // from the dropped dust pair
    expect(r.pairs[0]).toMatchObject({ liquidityUsd: 9e5, volume24hUsd: 250000, buys24h: 120 });
  });

  it("keeps one pair when every pair is dust, so rules can still fire", async () => {
    routeFetch([["/token-pairs/v1/ethereum/", [liq(300, 1), liq(200, 2)]]]);
    const r = await fetchPairs({ chain: "ethereum", address: ADDR });
    expect(r.pairs).toHaveLength(1);
    expect(r.pairs[0].liquidityUsd).toBe(300);
  });

  it("marks a quote asset (USDT-style) and ages it by pools of either side", async () => {
    const quoteSide = (usd: number, i: number, created: string) => dsPair({
      pairAddress: `0xq${i}`, liquidity: { usd }, pairCreatedAt: Date.parse(created),
      baseToken: { address: `0x${"2".repeat(40)}`, name: "Other", symbol: "OTH" },
      quoteToken: { address: ADDR, name: "Tether", symbol: "USDT" } });
    routeFetch([["/token-pairs/v1/ethereum/", [
      liq(900, 1, { pairCreatedAt: Date.parse("2026-09-20") }),
      quoteSide(5e7, 2, "2020-05-05"), quoteSide(1e7, 3, "2021-01-01"),
    ]]]);
    const r = await fetchPairs({ chain: "ethereum", address: ADDR });
    expect(r.quoteAsset).toBe(true);
    expect(r.pairs.map((p) => p.pairAddress)).toEqual(["0xp1"]); // base side only
    expect(r.oldestPairCreatedAt).toBe("2020-05-05T00:00:00.000Z");
  });

  it("without a chain keeps only the deepest chain", async () => {
    routeFetch([["/latest/dex/search", { pairs: [
      liq(1e5, 1, { chainId: "bsc" }), liq(8e5, 2, { chainId: "base" }), liq(2e5, 3, { chainId: "base" }),
    ] }]]);
    const r = await fetchPairs({ address: ADDR });
    expect(r.pairs.every((p) => p.chain === "base")).toBe(true);
    expect(r.totalPairsSeen).toBe(2);
  });
});

describe("fetch_metrics (ch06 §6.4.2)", () => {
  it("takes CoinGecko as primary and derives liquidity from pairs", async () => {
    routeFetch([
      ["/coins/meme?", cgCoin("meme", "meme")],
      ["/token-pairs/v1/ethereum/", [liq(4e5, 1), liq(1e5, 2)]],
      ["/search?query=meme", { coins: [{ id: "meme", symbol: "MEME", name: "Meme" }] }],
    ]);
    const m = await fetchMetrics({ cgId: "meme", chain: "ethereum", address: ADDR, symbol: "MEME" });
    for (const k of ["priceUsd", "change24hPct", "marketCapUsd", "fdvUsd", "volume24hUsd"] as const) {
      expect(m[k].source).toBe("coingecko");
      expect(m[k].asOf).toMatch(/Z$/);
    }
    expect(m.liquidityUsd).toMatchObject({ value: 5e5, source: "derived" });
    expect(m.holders.value).toBeNull();
    expect(m.socials).toMatchObject({ website: "https://example.org", twitter: "meme",
      telegram: null, discord: "https://discord.gg/x", curated: true });
    expect(m.descriptionSnippet).toBe("A meme coin.");
    expect(m.partial).toBe(false);
  });

  it("CoinGecko 429 → DexScreener numbers, partial with the error tag", async () => {
    routeFetch([
      ["api.coingecko.com", {}, 429],
      ["/token-pairs/v1/ethereum/", [liq(4e5, 1)]],
    ]);
    const m = await fetchMetrics({ cgId: "meme", chain: "ethereum", address: ADDR, symbol: "MEME" });
    expect(m.priceUsd).toMatchObject({ value: 0.0000123, source: "dexscreener" });
    expect(m.marketCapUsd.value).toBe(5.1e9); // string "5100000000" parsed
    expect(m.partial).toBe(true);
    expect(m.errors).toContain("coingecko:429");
    expect(m.socials.curated).toBe(false);
  });

  it("market cap 0 on CoinGecko becomes null, not zero", async () => {
    routeFetch([["/coins/meme?", cgCoin("meme", "meme", { market_data: {
      current_price: { usd: 1 }, market_cap: { usd: 0 } } })],
      ["/search?query=", { coins: [] }]]);
    const m = await fetchMetrics({ cgId: "meme", symbol: "MEME" });
    expect(m.marketCapUsd.value).toBeNull();
  });

  it("reports a rate limit (not UPSTREAM_DOWN) when the only source is throttled", async () => {
    routeFetch([["api.coingecko.com", {}, 429]]);
    await expect(fetchMetrics({ cgId: "bitcoin", symbol: "BTC" })).rejects.toMatchObject(
      { tag: "coingecko:429" });
  });

  it("requires cgId or address", async () => {
    await expect(fetchMetrics({ symbol: "X" })).rejects.toThrow("cgId or address");
  });

  it("snippet strips HTML and cuts at a word boundary under 600 chars", () => {
    const s = snippet(`<p>${"word ".repeat(200)}</p>`)!;
    expect(s.length).toBeLessThanOrEqual(600);
    expect(s.endsWith("…")).toBe(true);
    expect(s).not.toMatch(/</);
  });
});
