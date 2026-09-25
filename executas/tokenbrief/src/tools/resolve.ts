// executas/tokenbrief/src/tools/resolve.ts — ch06 §6.3, with the Chapter 10 refinements:
// (1) a CoinGecko URL whose id 404s falls back to searching that id; (2) contract lookups
// try at most the two chains DexScreener shows, else EVM-only or solana-only defaults;
// (3) the first CoinGecko failure stops the platform loop; (4) ambiguous candidates carry
// empty contracts (the picker only needs name, cap and rank).
// Deviation D-16: tickers and CoinGecko/CMC links are never resolved from DexScreener search.
// DexScreener search is full of clones with fake liquidity (live, 2026-09-25: "ARB" → a
// days-old Solana "Arbitrum" reporting $207M liquidity; the real dogwifhat pools list as
// "$WIF"/"Wif" and did not appear at all). When CoinGecko cannot answer, the call fails with
// the rate-limit error (the UI counts down and retries) instead of guessing. Addresses and
// DexScreener links still resolve without CoinGecko, because the address pins the token.
// A 429 is never reported as "not found", and results produced while an upstream failed are
// cached for CACHE_DEGRADED_TTL_S only.
import { CG_PLATFORM_ORDER, fromCgPlatform, fromDsChainId, toCgPlatform, toDsChainId }
  from "../chains.js";
import { TtlCache } from "../clients/cache.js";
import * as cg from "../clients/coingecko.js";
import { CONFIG } from "../clients/config.js";
import * as dex from "../clients/dexscreener.js";
import { UpstreamDown } from "../errors.js";
import { num, positive } from "../num.js";
import type { Candidate, Chain, ResolvedToken, Source, TokenQuery } from "../types.js";

type Token = NonNullable<ResolvedToken["token"]>;

const EVM = /^0x[0-9a-fA-F]{40}$/;
const HEXISH = /^0x[0-9a-fA-F]{3,}$/; // looks like an address but is not 40 hex digits
const SOLANA = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const TICKER = /^\$?[A-Za-z0-9.\-]{1,15}$/;
const MAX_INPUT = 300;

export const coingeckoUrl = (cgId: string) => `https://www.coingecko.com/en/coins/${cgId}`;

export function parseQuery(input: string): TokenQuery {
  const raw = input.trim();
  if (!raw || raw.length > MAX_INPUT) return { raw: raw.slice(0, MAX_INPUT), kind: "invalid" };
  if (/^https?:\/\//i.test(raw)) return parseUrl(raw);
  if (EVM.test(raw)) return { raw, kind: "evm_address", address: raw.toLowerCase() };
  if (HEXISH.test(raw)) return { raw, kind: "invalid" }; // malformed address, not a ticker
  if (SOLANA.test(raw)) return { raw, kind: "solana_address", address: raw };
  if (TICKER.test(raw)) return { raw, kind: "ticker" };
  return { raw, kind: "invalid" };
}

function parseUrl(raw: string): TokenQuery {
  let url: URL;
  try { url = new URL(raw); } catch { return { raw, kind: "invalid" }; }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const seg = url.pathname.split("/").filter(Boolean);
  const i = seg.indexOf("coins");
  if (host === "coingecko.com" && i >= 0 && seg[i + 1]) {
    return { raw, kind: "url", cgIdHint: seg[i + 1].toLowerCase() };
  }
  if (host === "coinmarketcap.com" && seg[0] === "currencies" && seg[1]) {
    return { raw, kind: "url", cmcSlugHint: seg[1].toLowerCase() };
  }
  if (host === "dexscreener.com" && seg.length >= 2) {
    return { raw, kind: "url", chainHint: fromDsChainId(seg[0].toLowerCase()), pairHint: seg[1] };
  }
  return { raw, kind: "invalid" };
}

const cache = new TtlCache<ResolvedToken>();
const degraded = new WeakSet<ResolvedToken>(); // produced while an upstream was failing
export const clearResolveCache = () => cache.clear();

const result = (status: ResolvedToken["status"], query: TokenQuery, source: Source,
  extra: Partial<ResolvedToken> = {}): ResolvedToken =>
  ({ status, query, source, resolvedAt: new Date().toISOString(), ...extra });

export async function resolveToken({ query }: { query: string }): Promise<ResolvedToken> {
  const q = parseQuery(query);
  if (q.kind === "invalid") return result("not_found", q, "derived");
  const id = q.address ? `addr:${q.address}` : q.cgIdHint ? `cg:${q.cgIdHint}`
    : q.cmcSlugHint ? `cmc:${q.cmcSlugHint}` : q.pairHint ? `pair:${q.chainHint}:${q.pairHint}`
    : `sym:${q.raw.replace(/^\$/, "").toUpperCase()}`;
  const ttl = (r: ResolvedToken) => degraded.has(r) ? CONFIG.CACHE_DEGRADED_TTL_S
    : r.status === "not_found" ? CONFIG.CACHE_NEGATIVE_TTL_S : CONFIG.CACHE_RESOLVED_TTL_S;
  return cache.getOrLoad(`${q.kind}|${id}`, ttl, () => resolveUncached(q));
}

async function resolveUncached(q: TokenQuery): Promise<ResolvedToken> {
  if (q.cgIdHint) {
    const hit = await cg.coin(q.cgIdHint); // 429/5xx propagate: never guess, never "not found"
    if (hit) return result("resolved", q, "coingecko", { token: tokenFromCoin(hit.data) });
    // 404: the id is not a CoinGecko coin id → search it as a term below
  }
  if (q.address || q.pairHint) return resolveAddress(q);
  return resolveTicker(q, q.cmcSlugHint ?? q.cgIdHint ?? q.raw.replace(/^\$/, ""));
}

/**
 * CoinGecko coins whose symbol equals `term`, largest market cap first. Caps come from
 * /coins/markets, which is only asked when several coins share the symbol (one match needs no
 * ranking) and the answer is not already cached — the keyless budget is ~5 requests/minute.
 * The ticker path and the twin-ticker path use the same search and the same id set, so a
 * token pasted as a ticker or as an address gets the same twin list (QA row 9).
 */
export async function symbolCandidates(term: string, fuzzy = false): Promise<Candidate[]> {
  const hits = await cg.search(term);
  const t = term.toLowerCase();
  let same = hits.filter((h) => h.symbol.toLowerCase() === t);
  if (same.length === 0 && fuzzy) same = hits.slice(0, 5);
  if (same.length === 0) return [];
  const ids = same.map((h) => h.id);
  const cached = cg.peekMarkets(ids);
  const markets = cached.length || same.length === 1 ? cached : await cg.markets(ids);
  return same
    .map((h): Candidate => {
      const m = markets.find((x) => x.id === h.id);
      return { cgId: h.id, symbol: h.symbol.toUpperCase(), name: h.name,
        marketCapUsd: positive(m?.market_cap), rank: m?.market_cap_rank ?? h.market_cap_rank,
        contracts: {} };
    })
    .sort((a, b) => (b.marketCapUsd ?? -1) - (a.marketCapUsd ?? -1)); // nulls last
}

async function resolveTicker(q: TokenQuery, term: string): Promise<ResolvedToken> {
  const ranked = await symbolCandidates(term, true); // CoinGecko errors propagate
  if (ranked.length === 0) return result("not_found", q, "coingecko");
  const [top, second] = ranked;
  const dominant = ranked.length === 1 || (top.marketCapUsd !== null &&
    (second.marketCapUsd === null ||
      top.marketCapUsd >= CONFIG.RESOLVE_DOMINANCE_RATIO * second.marketCapUsd));
  if (!dominant) {
    return result("ambiguous", q, "coingecko",
      { candidates: ranked.slice(0, CONFIG.RESOLVE_MAX_CANDIDATES) });
  }
  const full = await cg.coin(top.cgId!); // also warms fetch_metrics' cache
  const base: Token = full ? tokenFromCoin(full.data) : top;
  return result("resolved", q, "coingecko", {
    token: { ...base, marketCapUsd: top.marketCapUsd ?? base.marketCapUsd,
      rank: top.rank ?? base.rank, twinTickers: ranked.slice(1) },
  });
}

async function resolveAddress(q: TokenQuery): Promise<ResolvedToken> {
  let address = q.address;
  let dsChain = q.chainHint && q.chainHint !== "other" ? toDsChainId(q.chainHint) : undefined;
  let dsDown = false;
  const dsFail = () => { dsDown = true; return null; };
  if (!address && q.pairHint) { // DexScreener URLs name a pair, not a token
    const hint = q.pairHint;
    const p = dsChain
      ? await dex.pair(dsChain, hint).catch(dsFail)
      : (await dex.searchPairs(hint).catch(dsFail))?.pairs
        .find((x) => dex.sameAddress(x.pairAddress, hint)) ?? null;
    address = p?.baseToken.address;
    dsChain = p?.chainId ?? dsChain;
    // A DexScreener URL may also name the token itself rather than a pair.
    if (!address && !dsDown && (EVM.test(hint) || SOLANA.test(hint))) address = hint;
  }
  if (!address) {
    if (dsDown) throw new UpstreamDown();
    return result("not_found", q, "dexscreener");
  }
  if (EVM.test(address)) address = address.toLowerCase();
  const pairs = [...((await dex.pairsForToken(address, dsChain).catch(dsFail))?.pairs ?? [])]
    .sort(dex.byLiq);
  const seen = [...new Set(pairs.map((p) => toCgPlatform(fromDsChainId(p.chainId))))]
    .filter((x): x is string => Boolean(x)).slice(0, 2);
  const platforms = seen.length ? seen
    : address.startsWith("0x") ? CG_PLATFORM_ORDER.filter((x) => x !== "solana") : ["solana"];
  let cgErr: unknown = null;
  for (const platform of platforms) {
    const hit = await cg.coinByContract(platform, address)
      .catch((e: unknown) => { cgErr = e; return null; });
    if (hit) {
      const pinned = { chain: fromCgPlatform(platform), address };
      const r = result("resolved", q, "coingecko", { token: tokenFromCoin(hit.data, pinned) });
      if (dsDown) degraded.add(r);
      return r;
    }
    if (cgErr) break; // do not hammer a rate-limited CoinGecko
  }
  if (pairs.length) { // the address pins the token: the DexScreener identity is exact
    const r = result("resolved", q, "dexscreener", { token: tokenFromPairs(pairs) });
    if (cgErr) degraded.add(r); // CoinGecko may still list it: re-check soon
    return r;
  }
  if (cgErr) throw cgErr; // cannot say "not found" while CoinGecko could not answer
  if (dsDown) throw new UpstreamDown();
  return result("not_found", q, "derived");
}

function tokenFromCoin(c: cg.CgCoin, pinned?: { chain: Chain; address: string }): Token {
  const contracts: Candidate["contracts"] = {};
  for (const [platform, addr] of Object.entries(c.platforms ?? {})) {
    const chain = fromCgPlatform(platform);
    if (platform && addr && chain !== "other") contracts[chain] = addr;
  }
  const own = c.asset_platform_id ? fromCgPlatform(c.asset_platform_id) : undefined;
  const primaryChain = pinned?.chain ??
    (own && contracts[own] ? own : (Object.keys(contracts) as Chain[])[0]);
  return {
    cgId: c.id, symbol: c.symbol.toUpperCase(), name: c.name,
    marketCapUsd: positive(c.market_data?.market_cap?.usd), rank: c.market_cap_rank ?? null,
    contracts, primaryChain,
    primaryAddress: pinned?.address ?? (primaryChain ? contracts[primaryChain] : undefined),
  };
}

function tokenFromPairs(sorted: dex.DsPair[]): Token {
  const top = sorted[0];
  const chain = fromDsChainId(top.chainId);
  return {
    symbol: top.baseToken.symbol.replace(/^\$/, "").toUpperCase(), name: top.baseToken.name,
    marketCapUsd: positive(num(top.marketCap)), rank: null,
    contracts: { [chain]: top.baseToken.address },
    primaryChain: chain, primaryAddress: top.baseToken.address,
  };
}
