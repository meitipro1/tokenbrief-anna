// executas/tokenbrief/test/resolve.test.ts — P-9.4: parseQuery table + resolveToken paths.
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseQuery, resolveToken } from "../src/tools/resolve.js";
import { cgCoin, dsPair, routeFetch } from "./helpers.js";

afterEach(() => vi.unstubAllGlobals());

const ADDR = "0x6982508145454Ce325dDbE47a25d4ec3d2311933";
const SOL = "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm";

describe("parseQuery (ch06 §6.3.1)", () => {
  it.each([
    ["PEPE", { kind: "ticker" }],
    ["$pepe", { kind: "ticker" }],
    ["  btc  ", { kind: "ticker", raw: "btc" }],
    ["1INCH", { kind: "ticker" }],
    [ADDR, { kind: "evm_address", address: ADDR.toLowerCase() }],
    [ADDR.toUpperCase().replace("0X", "0x"), { kind: "evm_address" }],
    [SOL, { kind: "solana_address", address: SOL }],
    ["https://www.coingecko.com/en/coins/pepe", { kind: "url", cgIdHint: "pepe" }],
    ["https://coingecko.com/fa/coins/dogwifcoin", { kind: "url", cgIdHint: "dogwifcoin" }],
    ["https://coinmarketcap.com/currencies/pepe/", { kind: "url", cmcSlugHint: "pepe" }],
    ["https://dexscreener.com/solana/EP2ib6dYdEeqD8MfE2ezHCxX3kP3K2eLKkirfPm5eyMx",
      { kind: "url", chainHint: "solana", pairHint: "EP2ib6dYdEeqD8MfE2ezHCxX3kP3K2eLKkirfPm5eyMx" }],
    ["https://dexscreener.com/bsc/0xabc", { kind: "url", chainHint: "bsc", pairHint: "0xabc" }],
    ["https://example.com/coins/pepe", { kind: "invalid" }],
    ["hello world", { kind: "invalid" }],
    ["", { kind: "invalid" }],
    ["🚀🚀", { kind: "invalid" }],
    ["6982508145454ce325ddbe47a25d4ec3d2311933", { kind: "invalid" }], // 40 hex, no 0x, too long
  ])("%s", (input, expected) => {
    expect(parseQuery(input)).toMatchObject(expected);
  });
});

describe("resolveToken (ch06 §6.3.2)", () => {
  it("dominant ticker resolves and reports twins", async () => {
    routeFetch([
      ["/search?query=pepe", { coins: [
        { id: "pepe", symbol: "PEPE", name: "Pepe", market_cap_rank: 30 },
        { id: "pepe-bsc", symbol: "PEPE", name: "Pepe BSC", market_cap_rank: null },
        { id: "pepecoin", symbol: "PEPECOIN", name: "PepeCoin", market_cap_rank: 900 },
      ] }],
      ["/coins/markets", [
        { id: "pepe", symbol: "pepe", name: "Pepe", market_cap: 5e9, market_cap_rank: 30 },
        { id: "pepe-bsc", symbol: "pepe", name: "Pepe BSC", market_cap: 1e6, market_cap_rank: null },
      ]],
      ["/coins/pepe?", cgCoin("pepe", "pepe")],
    ]);
    const r = await resolveToken({ query: "$PEPE" });
    expect(r.status).toBe("resolved");
    expect(r.token?.cgId).toBe("pepe");
    expect(r.token?.primaryChain).toBe("ethereum");
    expect(r.token?.twinTickers?.map((t) => t.cgId)).toEqual(["pepe-bsc"]);
  });

  it("similar caps are ambiguous, sorted by cap, nulls last", async () => {
    routeFetch([
      ["/search?query=arb", { coins: [
        { id: "arb-x", symbol: "ARB", name: "Arb X", market_cap_rank: null },
        { id: "arbitrum", symbol: "ARB", name: "Arbitrum", market_cap_rank: 60 },
        { id: "arb-y", symbol: "ARB", name: "Arb Y", market_cap_rank: 800 },
      ] }],
      ["/coins/markets", [
        { id: "arbitrum", symbol: "arb", name: "Arbitrum", market_cap: 2e9, market_cap_rank: 60 },
        { id: "arb-y", symbol: "arb", name: "Arb Y", market_cap: 3e8, market_cap_rank: 800 },
      ]],
    ]);
    const r = await resolveToken({ query: "ARB" });
    expect(r.status).toBe("ambiguous");
    expect(r.candidates?.map((c) => c.cgId)).toEqual(["arbitrum", "arb-y", "arb-x"]);
  });

  it("a picked candidate re-resolves through its CoinGecko URL", async () => {
    routeFetch([["/coins/arbitrum?", cgCoin("arbitrum", "arb",
      { asset_platform_id: "arbitrum-one", platforms: { "arbitrum-one": "0x912c" } })]]);
    const r = await resolveToken({ query: "https://www.coingecko.com/en/coins/arbitrum" });
    expect(r).toMatchObject({ status: "resolved", source: "coingecko" });
    expect(r.token).toMatchObject({ cgId: "arbitrum", primaryChain: "arbitrum",
      primaryAddress: "0x912c" });
  });

  it("CoinGecko and CMC URLs with the same slug do not share a cache entry", async () => {
    routeFetch([["/coins/pepe?", cgCoin("pepe", "pepe")],
      ["/search?query=pepe", { coins: [] }]]);
    expect((await resolveToken({ query: "https://coinmarketcap.com/currencies/pepe/" })).status)
      .toBe("not_found");
    expect((await resolveToken({ query: "https://www.coingecko.com/en/coins/pepe" })).status)
      .toBe("resolved");
  });

  it("a Solana address resolves via the contract lookup on the chain DexScreener shows",
    async () => {
      const { seen } = routeFetch([
        ["/latest/dex/search", { pairs: [dsPair({ chainId: "solana",
          baseToken: { address: SOL, name: "dogwifhat", symbol: "WIF" } })] }],
        ["/coins/solana/contract/", cgCoin("dogwifcoin", "wif",
          { asset_platform_id: "solana", platforms: { solana: SOL } })],
      ]);
      const r = await resolveToken({ query: SOL });
      expect(r.status).toBe("resolved");
      expect(r.token).toMatchObject({ cgId: "dogwifcoin", primaryChain: "solana",
        primaryAddress: SOL });
      expect(seen.filter((u) => u.includes("/contract/"))).toHaveLength(1);
    });

  it("an unlisted token resolves from DexScreener alone", async () => {
    routeFetch([["/latest/dex/search", { pairs: [dsPair({ chainId: "base",
      baseToken: { address: ADDR.toLowerCase(), name: "Fresh", symbol: "FRSH" } })] }]]);
    const r = await resolveToken({ query: ADDR });
    expect(r).toMatchObject({ status: "resolved", source: "dexscreener" });
    expect(r.token).toMatchObject({ symbol: "FRSH", primaryChain: "base" });
    expect(r.token?.cgId).toBeUndefined();
  });

  it("a DexScreener pair URL resolves to the pair's base token", async () => {
    routeFetch([
      ["/latest/dex/pairs/solana/PAIR1", { pairs: [dsPair({ chainId: "solana",
        pairAddress: "PAIR1", baseToken: { address: SOL, name: "dogwifhat", symbol: "WIF" } })] }],
      ["/token-pairs/v1/solana/", [dsPair({ chainId: "solana",
        baseToken: { address: SOL, name: "dogwifhat", symbol: "WIF" } })]],
      ["/coins/solana/contract/", cgCoin("dogwifcoin", "wif",
        { asset_platform_id: "solana", platforms: { solana: SOL } })],
    ]);
    const r = await resolveToken({ query: "https://dexscreener.com/solana/PAIR1" });
    expect(r.token).toMatchObject({ cgId: "dogwifcoin", primaryAddress: SOL });
  });

  it("unknown ticker and garbage are not_found without throwing", async () => {
    routeFetch([["/search?query=", { coins: [] }]]);
    expect((await resolveToken({ query: "NOTATOKEN123" })).status).toBe("not_found");
    const bad = await resolveToken({ query: "hello world" });
    expect(bad).toMatchObject({ status: "not_found", query: { kind: "invalid" } });
  });

  it("falls back to DexScreener search when CoinGecko is rate-limited", async () => {
    routeFetch([
      ["api.coingecko.com", {}, 429],
      ["/latest/dex/search?q=WIF", { pairs: [
        dsPair({ chainId: "solana", baseToken: { address: SOL, name: "dogwifhat", symbol: "WIF" } }),
      ] }],
    ]);
    const r = await resolveToken({ query: "WIF" });
    expect(r).toMatchObject({ status: "resolved", source: "dexscreener" });
  });

  it("throws UPSTREAM_DOWN when both sources fail", async () => {
    routeFetch([["api.coingecko.com", {}, 503], ["api.dexscreener.com", {}, 503]]);
    await expect(resolveToken({ query: "DOGE" })).rejects.toThrow("UPSTREAM_DOWN");
  });
});
