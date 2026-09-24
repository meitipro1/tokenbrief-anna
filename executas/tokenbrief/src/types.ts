// executas/tokenbrief/src/types.ts — ch06 §6.2, plus the two additions decided in
// Chapter 10: PairsResult.oldestPairCreatedAt and ResolvedToken.token.twinTickers.
// ui/src/types.ts is an identical copy — keep them in sync.

export type Chain =
  | "ethereum" | "bsc" | "solana" | "base" | "arbitrum" | "polygon"
  | "avalanche" | "optimism" | "tron" | "ton" | "sui" | "other";

export type Source = "coingecko" | "dexscreener" | "derived";

export interface TokenQuery {
  raw: string; // exactly what the user typed, trimmed
  kind: "ticker" | "evm_address" | "solana_address" | "url" | "invalid";
  address?: string; // EVM lower-cased; Solana base58 as typed
  chainHint?: Chain; // from a DexScreener/CMC URL path
  cgIdHint?: string; // coingecko.com/en/coins/<id>
  cmcSlugHint?: string; // coinmarketcap.com/currencies/<slug>
  pairHint?: string; // dexscreener.com/<chain>/<pairAddress>
}

export interface Candidate {
  cgId?: string;
  symbol: string; // upper-case
  name: string;
  marketCapUsd: number | null;
  rank: number | null; // CoinGecko market_cap_rank
  contracts: Partial<Record<Chain, string>>;
}

export interface ResolvedToken {
  status: "resolved" | "ambiguous" | "not_found";
  query: TokenQuery;
  token?: Candidate & {
    primaryChain?: Chain;
    primaryAddress?: string;
    twinTickers?: Candidate[]; // Chapter 10 addition (§6.3.2 assigns it)
  };
  candidates?: Candidate[]; // top-N by market cap when ambiguous
  source: Source;
  resolvedAt: string; // ISO-8601 UTC
}

export interface Sourced<T> {
  value: T | null;
  source: Source | null;
  asOf: string | null; // ISO-8601 UTC of the upstream fetch
}

export interface Socials {
  website: string | null;
  twitter: string | null; // handle without @
  telegram: string | null;
  discord: string | null;
  github: string | null;
  curated: boolean; // true = from CoinGecko links (curated)
}

export interface Metrics {
  cgId: string | null;
  symbol: string;
  name: string;
  priceUsd: Sourced<number>;
  change24hPct: Sourced<number>;
  marketCapUsd: Sourced<number>;
  fdvUsd: Sourced<number>;
  volume24hUsd: Sourced<number>;
  liquidityUsd: Sourced<number>; // sum over selected pairs (§6.4.3)
  holders: Sourced<number>; // null unless a free source appears
  circulatingSupply: Sourced<number>;
  totalSupply: Sourced<number>;
  maxSupply: Sourced<number>;
  athUsd: Sourced<number>;
  athChangePct: Sourced<number>;
  listingAgeDays: Sourced<number>; // genesis_date, else oldest pair
  rank: Sourced<number>;
  categories: string[];
  descriptionSnippet: string | null; // CoinGecko description.en, ≤600 chars
  socials: Socials;
  twinTickers: Candidate[]; // other coins with the same symbol
  fetchedAt: string;
  partial: boolean; // true if any upstream call failed
  errors: string[]; // e.g. ["coingecko:429"]
}

export interface Pair {
  chain: Chain;
  dexId: string;
  pairAddress: string;
  url: string;
  baseSymbol: string;
  quoteSymbol: string;
  priceUsd: number | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  buys24h: number | null;
  sells24h: number | null;
  priceChange24hPct: number | null;
  pairCreatedAt: string | null; // ISO-8601 UTC (DexScreener gives ms)
}

export interface PairsResult {
  pairs: Pair[]; // top-N by liquidity, deduplicated
  totalPairsSeen: number;
  oldestPairCreatedAt: string | null; // Chapter 10 addition: min over ALL pairs seen
  quoteAsset?: boolean; // decisions.md D-8: liquidity mostly in pools where it is the quote
  fetchedAt: string;
  source: "dexscreener";
}

export type RiskCode =
  | "FRESH_PAIR" | "LOW_LIQUIDITY" | "THIN_VS_CAP" | "TWIN_TICKER"
  | "FDV_MC_GAP" | "NO_VERIFIED_SOCIALS" | "SELF_REPORTED_SOCIALS"
  | "SINGLE_PAIR" | "PAIR_CONCENTRATION" | "PRICE_SPIKE"
  | "VOLUME_ANOMALY" | "NO_SELLS" | "SELL_PRESSURE" | "NO_CG_LISTING"
  | "PARTIAL_DATA";

export type Severity = "info" | "warn" | "high";

export interface RiskFlag {
  code: RiskCode;
  severity: Severity;
  message: string; // English, one sentence, no digits
  evidence: Record<string, number | string | null>;
  rule: string; // e.g. "oldestPairAgeDays < 7"
}

export interface BriefText { // what the LLM returns (validated)
  what: string;
  narrative: string;
  risk_commentary: string;
  questions: [string, string, string, string, string];
  share: string;
  confidence: "low" | "medium" | "high";
}

export interface ShareCard {
  text: string; // substituted, ≤ 280 chars incl. link
  textFa: string | null;
  link: string; // app store link with UTM
}

export interface Brief {
  id: string; // `${cgId ?? address}:${yyyy-mm-ddThh}`
  resolved: ResolvedToken;
  metrics: Metrics;
  pairs: PairsResult;
  flags: RiskFlag[];
  text: { en: BriefText | null; fa: BriefText | null };
  share: ShareCard;
  facts: Record<string, Fact>; // the FACTS map sent to the LLM
  generatedAt: string;
  llm: { model: string | null; templateFallback: boolean };
}

export interface Fact {
  label: string; // "Price (USD)"
  value: number | string | null;
  unit: "usd" | "pct" | "count" | "days" | "text";
  source: Source | null;
  asOf: string | null;
}
