// executas/tokenbrief/src/tools/metrics.ts — ch06 §6.4.2 and §6.4.4. `pick` is where source
// attribution happens: a CoinGecko value is tagged coingecko with its fetch time; if missing,
// the DexScreener value is used and tagged dexscreener (or derived for sums).
import * as cg from "../clients/coingecko.js";
import { CONFIG, type Config } from "../clients/config.js";
import type { DsPair } from "../clients/dexscreener.js";
import { InvalidParams, RateLimitTimeout, UpstreamDown, UpstreamError } from "../errors.js";
import { num, positive } from "../num.js";
import type { Candidate, Chain, Metrics, Socials, Source, Sourced } from "../types.js";
import { loadPairs } from "./pairs.js";
import { symbolCandidates } from "./resolve.js";

const NIL: Sourced<never> = { value: null, source: null, asOf: null };
const S = <T>(value: T | null | undefined, source: Source, asOf: string | null): Sourced<T> =>
  value === null || value === undefined ? NIL : { value, source, asOf };

const ageDays = (iso?: string | null): number | null => {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? Math.floor((Date.now() - t) / 86_400_000) : null;
};

export interface MetricsArgs { cgId?: string; chain?: Chain; address?: string; symbol: string }

export async function fetchMetrics(a: MetricsArgs, cfg: Config = CONFIG): Promise<Metrics> {
  if (!a.cgId && !a.address) throw new InvalidParams("cgId or address is required");
  const errors: string[] = [];
  let rateLimited: UpstreamError | null = null;
  const note = (e: unknown): null => {
    errors.push(e instanceof UpstreamError ? e.tag : "internal:error");
    if (e instanceof RateLimitTimeout || (e instanceof UpstreamError && e.status === 429)) {
      rateLimited = e;
    }
    return null;
  };
  const [coin, lp] = await Promise.all([
    a.cgId ? cg.coin(a.cgId).catch(note) : null,
    a.address ? loadPairs(a.address, a.chain, cfg).catch(note) : null,
  ]);
  // §6.4.4: both sources gave nothing. A rate limit is reported as such so the UI retries.
  if (!coin && !lp?.best && !lp?.result.quoteAsset) throw rateLimited ?? new UpstreamDown();
  const c = coin?.data;
  const md = c?.market_data;
  const cgAt = coin?.fetchedAt ?? null;
  const best: DsPair | null = lp?.best ?? null;
  const dsAt = lp?.result.fetchedAt ?? null;
  const kept = lp?.result.pairs ?? [];
  const quoteAsset = lp?.result.quoteAsset === true;
  const sum = (xs: (number | null)[]) =>
    xs.some((x) => x !== null) ? xs.reduce<number>((s, x) => s + (x ?? 0), 0) : null;
  const pick = (cgValue: number | null | undefined, dsValue: number | null,
    dsSource: Source = "dexscreener"): Sourced<number> =>
    cgValue !== null && cgValue !== undefined ? S(cgValue, "coingecko", cgAt)
      : S(dsValue, dsSource, dsAt);
  const twins: Candidate[] = await symbolCandidates(a.symbol.replace(/^\$/, ""))
    .then((list) => list.filter((x) => x.cgId !== c?.id))
    .catch((e) => { note(e); return []; });
  const genesisAge = ageDays(c?.genesis_date);
  return {
    cgId: c?.id ?? null,
    symbol: (c?.symbol ?? a.symbol).toUpperCase(),
    name: c?.name ?? best?.baseToken.name ?? a.symbol,
    priceUsd: pick(md?.current_price?.usd, num(best?.priceUsd)),
    change24hPct: pick(md?.price_change_percentage_24h, num(best?.priceChange?.h24)),
    marketCapUsd: pick(positive(md?.market_cap?.usd), positive(best?.marketCap)),
    fdvUsd: pick(positive(md?.fully_diluted_valuation?.usd), positive(best?.fdv)),
    volume24hUsd: pick(md?.total_volume?.usd,
      quoteAsset ? null : sum(kept.map((p) => p.volume24hUsd)), "derived"),
    liquidityUsd: quoteAsset ? NIL : S(sum(kept.map((p) => p.liquidityUsd)), "derived", dsAt),
    holders: NIL, // no keyless source (§6.4.2)
    circulatingSupply: S(md?.circulating_supply, "coingecko", cgAt),
    totalSupply: S(md?.total_supply, "coingecko", cgAt),
    maxSupply: S(md?.max_supply, "coingecko", cgAt),
    athUsd: S(md?.ath?.usd, "coingecko", cgAt),
    athChangePct: S(md?.ath_change_percentage?.usd, "coingecko", cgAt),
    listingAgeDays: genesisAge !== null ? S(genesisAge, "coingecko", cgAt)
      : S(ageDays(lp?.result.oldestPairCreatedAt), "derived", dsAt),
    rank: S(c?.market_cap_rank, "coingecko", cgAt),
    categories: (c?.categories ?? []).filter((x): x is string => Boolean(x)).slice(0, 6),
    descriptionSnippet: snippet(c?.description?.en),
    socials: c ? cgSocials(c) : dsSocials(best),
    twinTickers: twins,
    fetchedAt: new Date().toISOString(),
    partial: errors.length > 0,
    errors,
  };
}

export function snippet(html?: string): string | null {
  const text = (html ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return null;
  if (text.length <= 600) return text;
  const cut = text.slice(0, 599);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), 1)) + "…";
}

function cgSocials(c: cg.CgCoin): Socials {
  const l = c.links ?? {};
  return {
    website: l.homepage?.find(Boolean) ?? null,
    twitter: l.twitter_screen_name || null,
    telegram: l.telegram_channel_identifier || null,
    discord: l.chat_url?.find((u) => u.includes("discord")) ?? null,
    github: l.repos_url?.github?.find(Boolean) ?? null,
    curated: true,
  };
}

function dsSocials(p: DsPair | null): Socials {
  const links = p?.info?.socials ?? [];
  const find = (kind: string) => {
    const s = links.find((x) => (x.type ?? x.platform) === kind);
    return s ? s.url ?? s.handle ?? null : null;
  };
  const tw = find("twitter");
  return {
    website: p?.info?.websites?.[0]?.url ?? null,
    twitter: tw ? tw.replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//, "").replace(/^@/, "") : null,
    telegram: find("telegram"),
    discord: find("discord"),
    github: null,
    curated: false,
  };
}
