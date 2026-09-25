// executas/tokenbrief/src/clients/coingecko.ts — only the four calls in the ch06 §6.9 budget.
// search lower-cases the term and markets sorts its ids, so the resolve path and the
// twin-ticker path share cache entries.
import { CONFIG } from "./config.js";
import { fetchJson, peekJson, primeJson, type Fetched } from "./http.js";

type Usd = { usd?: number | null };

export interface CgSearchCoin {
  id: string; name: string; symbol: string; market_cap_rank: number | null;
}

export interface CgMarket {
  id: string; symbol: string; name: string;
  market_cap: number | null; market_cap_rank: number | null;
}

export interface CgCoin {
  id: string; symbol: string; name: string;
  asset_platform_id?: string | null;
  platforms?: Record<string, string | null>;
  categories?: (string | null)[];
  genesis_date?: string | null;
  market_cap_rank?: number | null;
  description?: { en?: string };
  links?: {
    homepage?: string[]; twitter_screen_name?: string | null;
    telegram_channel_identifier?: string | null; chat_url?: string[];
    repos_url?: { github?: string[] };
  };
  market_data?: {
    current_price?: Usd; market_cap?: Usd; fully_diluted_valuation?: Usd; total_volume?: Usd;
    price_change_percentage_24h?: number | null; ath?: Usd; ath_change_percentage?: Usd;
    circulating_supply?: number | null; total_supply?: number | null; max_supply?: number | null;
    last_updated?: string | null;
  };
}

const B = CONFIG.CG_BASE;
const e = encodeURIComponent;
const COIN_QS = "localization=false&tickers=false&market_data=true&community_data=false" +
  "&developer_data=false&sparkline=false";

export async function search(term: string): Promise<CgSearchCoin[]> {
  const url = `${B}/search?query=${e(term.toLowerCase())}`;
  const r = await fetchJson<{ coins?: CgSearchCoin[] }>(url, { ttl: CONFIG.CACHE_SEARCH_TTL_S });
  return r?.data.coins ?? [];
}

function marketsUrl(ids: string[]): string | null {
  const sorted = [...new Set(ids)].sort().slice(0, 50);
  return sorted.length ? `${B}/coins/markets?vs_currency=usd&ids=${sorted.map(e).join(",")}` +
    `&per_page=${sorted.length}&page=1` : null;
}

export async function markets(ids: string[]): Promise<CgMarket[]> {
  const url = marketsUrl(ids);
  if (!url) return [];
  const r = await fetchJson<CgMarket[]>(url, { ttl: CONFIG.CACHE_MARKETS_TTL_S });
  return r?.data ?? [];
}

/** Market caps only if this exact id set is already cached — never a network call. */
export function peekMarkets(ids: string[]): CgMarket[] {
  const url = marketsUrl(ids);
  return (url && peekJson<CgMarket[]>(url)?.data) || [];
}

const coinUrl = (id: string) => `${B}/coins/${e(id)}?${COIN_QS}`;

export const coin = (id: string) => fetchJson<CgCoin>(coinUrl(id), { ttl: CONFIG.CACHE_COIN_TTL_S });

/**
 * Contract lookup. The response is the full coin object (market_data included), so it also
 * seeds /coins/{id}: fetch_metrics then needs no second CoinGecko request (keyless budget).
 */
export async function coinByContract(platform: string, address: string) {
  const r = await fetchJson<CgCoin>(`${B}/coins/${e(platform)}/contract/${e(address)}`,
    { ttl: CONFIG.CACHE_CONTRACT_TTL_S });
  if (r?.data?.id && r.data.market_data) {
    primeJson(coinUrl(r.data.id), r as Fetched<unknown>, CONFIG.CACHE_COIN_TTL_S);
  }
  return r;
}
