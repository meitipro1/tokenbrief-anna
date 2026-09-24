// executas/tokenbrief/src/manifest.ts — the bare `describe` result. Parameter descriptions
// are written for the chat LLM, which reads them ("description is what the LLM sees").
declare const __VERSION__: string | undefined;
export const VERSION = typeof __VERSION__ === "string" ? __VERSION__ : "0.0.0-dev";

const p = (name: string, type: string, description: string, required = true) =>
  ({ name, type, description, required });

export const MANIFEST = {
  name: "tokenbrief",
  display_name: "TokenBrief Data",
  version: VERSION,
  description:
    "Resolves a crypto token from a ticker, contract address or CoinGecko/CMC/DexScreener " +
    "link and returns live metrics, pairs and rule-based risk flags from CoinGecko and " +
    "DexScreener (keyless).",
  author: "meitipro1",
  runtime: { type: "binary" },
  credentials: [],
  host_capabilities: [],
  tools: [
    {
      name: "resolve_token",
      timeout: 25,
      description:
        "Resolve what the user typed to one token. Returns status resolved | ambiguous | " +
        "not_found. When ambiguous, show the candidates and call again with " +
        "https://www.coingecko.com/en/coins/<cgId> of the one the user picks.",
      parameters: [
        p("query", "string", "Exactly what the user typed: a ticker ($PEPE), an EVM or " +
          "Solana contract address, or a CoinGecko, CoinMarketCap or DexScreener URL."),
      ],
    },
    {
      name: "fetch_metrics",
      timeout: 25,
      description:
        "Live price, 24h change, market cap, FDV, volume, liquidity, supply, ATH, listing " +
        "age, socials and same-ticker coins. Each number carries its source and fetch time.",
      parameters: [
        p("cgId", "string", "token.cgId from resolve_token, if present", false),
        p("chain", "string", "token.primaryChain from resolve_token", false),
        p("address", "string", "token.primaryAddress from resolve_token", false),
        p("symbol", "string", "token.symbol from resolve_token"),
      ],
    },
    {
      name: "fetch_pairs",
      timeout: 25,
      description: "Top DexScreener pairs by liquidity: liquidity, 24h volume, buys, sells, age.",
      parameters: [
        p("chain", "string", "token.primaryChain from resolve_token", false),
        p("address", "string", "token.primaryAddress from resolve_token"),
      ],
    },
    {
      name: "risk_flags",
      timeout: 10,
      description:
        "Rule-based risk flags computed from fetch_metrics and fetch_pairs results. Report " +
        "them as returned; never add flags of your own.",
      parameters: [
        p("metrics", "object", "the full fetch_metrics result"),
        p("pairs", "object", "the full fetch_pairs result; omit when there is no address", false),
      ],
    },
  ],
};
