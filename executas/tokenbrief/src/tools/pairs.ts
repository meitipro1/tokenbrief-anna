// executas/tokenbrief/src/tools/pairs.ts — ch06 §6.4.3. loadPairs is shared with
// fetch_metrics; the TTL cache + single-flight mean the UI's parallel fetch_pairs call does
// not send a second request.
import { fromDsChainId, toDsChainId } from "../chains.js";
import { CONFIG, type Config } from "../clients/config.js";
import * as dex from "../clients/dexscreener.js";
import { num } from "../num.js";
import type { Chain, Pair, PairsResult } from "../types.js";

export interface LoadedPairs { result: PairsResult; best: dex.DsPair | null }

export async function loadPairs(address: string, chain?: Chain, cfg: Config = CONFIG):
  Promise<LoadedPairs> {
  const dsChain = chain && chain !== "other" ? toDsChainId(chain) : undefined;
  const { pairs: fetched, quotePairs, fetchedAt } = await dex.pairsForToken(address, dsChain);
  let raw = fetched;
  let quote = quotePairs;
  const all = [...raw, ...quote];
  if (!dsChain && all.length) { // same address on several chains: keep the deepest chain
    const deepest = [...all].sort(dex.byLiq)[0].chainId;
    raw = raw.filter((p) => p.chainId === deepest);
    quote = quote.filter((p) => p.chainId === deepest);
  }
  // A token whose liquidity sits mostly in pools where it is the QUOTE side (stablecoins,
  // WETH) has no attributable DEX liquidity of its own: mark it so the liquidity rules skip
  // instead of reporting the dust left in its few base-side pools (decisions.md D-8).
  const sumLiq = (xs: dex.DsPair[]) => xs.reduce((s, p) => s + dex.liq(p), 0);
  const quoteAsset = quote.length > 0 && sumLiq(quote) > sumLiq(raw);
  // oldest pool of either side: a fresh base-side pool must not make USDT look new
  const created = [...raw, ...quote].map((p) => p.pairCreatedAt)
    .filter((t): t is number => typeof t === "number" && t > 0);
  const unique = [...new Map(raw.map((p) => [p.pairAddress, p])).values()].sort(dex.byLiq);
  let kept = unique.filter((p) => dex.liq(p) >= cfg.PAIR_MIN_LIQ_USD);
  if (kept.length === 0 && unique.length) kept = [unique[0]]; // keep one so rules can fire
  kept = kept.slice(0, cfg.PAIRS_TOP_N);
  return {
    best: kept[0] ?? null,
    result: {
      pairs: kept.map(toPair),
      totalPairsSeen: raw.length, // before the liquidity filter (SINGLE_PAIR)
      quoteAsset,
      oldestPairCreatedAt: created.length ? new Date(Math.min(...created)).toISOString() : null,
      fetchedAt,
      source: "dexscreener",
    },
  };
}

export async function fetchPairs(a: { chain?: Chain; address: string }): Promise<PairsResult> {
  return (await loadPairs(a.address, a.chain)).result;
}

function toPair(p: dex.DsPair): Pair {
  return {
    chain: fromDsChainId(p.chainId), dexId: p.dexId, pairAddress: p.pairAddress, url: p.url,
    baseSymbol: p.baseToken.symbol, quoteSymbol: p.quoteToken?.symbol ?? "",
    priceUsd: num(p.priceUsd), liquidityUsd: num(p.liquidity?.usd),
    volume24hUsd: num(p.volume?.h24),
    buys24h: num(p.txns?.h24?.buys), sells24h: num(p.txns?.h24?.sells),
    priceChange24hPct: num(p.priceChange?.h24),
    pairCreatedAt: p.pairCreatedAt ? new Date(p.pairCreatedAt).toISOString() : null,
  };
}
