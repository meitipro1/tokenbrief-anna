// executas/tokenbrief/src/chains.ts — the ch06 §6.3.2 chain map.
import type { Chain } from "./types.js";

const TABLE: [Chain, string, string][] = [ // [Chain, CoinGecko platform id, DexScreener chainId]
  ["ethereum", "ethereum", "ethereum"],
  ["bsc", "binance-smart-chain", "bsc"],
  ["solana", "solana", "solana"],
  ["base", "base", "base"],
  ["arbitrum", "arbitrum-one", "arbitrum"],
  ["polygon", "polygon-pos", "polygon"],
  ["avalanche", "avalanche", "avalanche"],
  ["optimism", "optimistic-ethereum", "optimism"],
  ["tron", "tron", "tron"],
  ["ton", "the-open-network", "ton"],
  ["sui", "sui", "sui"],
];

/** Fallback order for contract lookups when DexScreener shows no pairs. */
export const CG_PLATFORM_ORDER = [
  "ethereum", "binance-smart-chain", "solana", "base", "arbitrum-one", "polygon-pos",
];

export const toCgPlatform = (c: Chain) => TABLE.find((r) => r[0] === c)?.[1];
export const toDsChainId = (c: Chain) => TABLE.find((r) => r[0] === c)?.[2];
export const fromCgPlatform = (id: string): Chain =>
  TABLE.find((r) => r[1] === id)?.[0] ?? "other";
export const fromDsChainId = (id: string): Chain =>
  TABLE.find((r) => r[2] === id)?.[0] ?? "other";

/** Accepts any of the three spellings (the chat LLM may pass "binance-smart-chain"). */
export function normalizeChain(s?: string): Chain | undefined {
  if (!s) return undefined;
  const k = s.toLowerCase();
  return TABLE.find(([c, cg, ds]) => k === c || k === cg || k === ds)?.[0] ?? "other";
}
