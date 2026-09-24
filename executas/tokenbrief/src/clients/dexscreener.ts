// executas/tokenbrief/src/clients/dexscreener.ts — chain-scoped /token-pairs/v1 when the
// chain is known, /latest/dex/search otherwise. Results are filtered to pairs where the
// token is the BASE token (raw endpoints also return pools where it is only the quote).
import { num } from "../num.js";
import { CONFIG } from "./config.js";
import { fetchJson } from "./http.js";

export interface DsLink { url?: string; label?: string; type?: string; platform?: string;
  handle?: string }

export interface DsPair {
  chainId: string; dexId: string; url: string; pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; name: string; symbol: string };
  priceUsd?: string | number | null;
  txns?: Record<string, { buys?: number; sells?: number }>;
  volume?: Record<string, number | string>;
  priceChange?: Record<string, number | string>;
  liquidity?: { usd?: number | string };
  fdv?: number | string | null;
  marketCap?: number | string | null;
  pairCreatedAt?: number | null;
  info?: { websites?: DsLink[]; socials?: DsLink[] };
}

export interface DsPairs { pairs: DsPair[]; fetchedAt: string }
export interface TokenPools extends DsPairs { quotePairs: DsPair[] }

const B = CONFIG.DS_BASE;
const e = encodeURIComponent;

export const liq = (p: DsPair): number => num(p.liquidity?.usd) ?? 0;
export const byLiq = (a: DsPair, b: DsPair): number => liq(b) - liq(a);
export const sameAddress = (a: string, b: string): boolean =>
  a.startsWith("0x") ? a.toLowerCase() === b.toLowerCase() : a === b;

function pairsOf(d: unknown): DsPair[] {
  if (Array.isArray(d)) return d as DsPair[]; // /token-pairs/v1 returns a bare array
  const o = d as { pairs?: DsPair[] | null; pair?: DsPair | null } | null | undefined;
  return o?.pairs ?? (o?.pair ? [o.pair] : []); // /latest/dex/* wraps in {pairs}
}

async function get(url: string, ttl: number): Promise<DsPairs> {
  const r = await fetchJson<unknown>(url, { ttl });
  return { pairs: pairsOf(r?.data), fetchedAt: r?.fetchedAt ?? new Date().toISOString() };
}

export const tokenPairs = (dsChain: string, address: string) =>
  get(`${B}/token-pairs/v1/${e(dsChain)}/${e(address)}`, CONFIG.CACHE_PAIRS_TTL_S);

export const searchPairs = (q: string) =>
  get(`${B}/latest/dex/search?q=${e(q)}`, CONFIG.CACHE_PAIRS_TTL_S);

export async function pair(dsChain: string, pairAddress: string): Promise<DsPair | null> {
  const r = await get(`${B}/latest/dex/pairs/${e(dsChain)}/${e(pairAddress)}`,
    CONFIG.CACHE_PAIR_TTL_S);
  return r.pairs[0] ?? null;
}

/**
 * Pools for `address`, split by side: `pairs` where it is the base token, `quotePairs` where it
 * is only the quote (WETH/USDT in most pools). Chain-scoped endpoint when the chain is known.
 */
export async function pairsForToken(address: string, dsChain?: string): Promise<TokenPools> {
  const r = dsChain ? await tokenPairs(dsChain, address) : await searchPairs(address);
  const onChain = r.pairs.filter((p) => !dsChain || p.chainId === dsChain);
  const pairs = onChain.filter((p) => p.baseToken?.address &&
    sameAddress(p.baseToken.address, address));
  const quotePairs = onChain.filter((p) => p.quoteToken?.address &&
    sameAddress(p.quoteToken.address, address) && !pairs.includes(p));
  return { pairs, quotePairs, fetchedAt: r.fetchedAt };
}
