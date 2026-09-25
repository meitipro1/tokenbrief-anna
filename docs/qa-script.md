# Manual QA inside Anna (roadmap §11.7) — run before `apps submit-review`

Run twice: desktop window, and mobile shell at 320 px (DevTools iPhone SE).
`scripts/qa-run.ts` drives rows 1–12 through `anna-app dev` and writes docs/qa-results.md;
the real-LLM columns (prose quality, Persian) still need a human pass. Developer-account
runs are QA only and do not count toward MAU. For each row record time-to-brief, whether the
numbers match the source page (price within 2 %, market cap within 5 %), Persian readable (RTL,
Latin digits), copy pastes cleanly into Telegram, follow-up answers without re-fetching.

| # | Input | Class | Expected | Desktop | Mobile |
|---|---|---|---|---|---|
| 1 | `BTC` | major | Brief; no pair rules (PARTIAL_DATA "not checked: pairs null") | | |
| 2 | `ETH` | major | Brief; narrative mentions smart contracts / L1 | | |
| 3 | `SOL` | major | Solana (rank 7); no TWIN_TICKER — CoinGecko search has no other exact-`SOL` coin (checked 2026-09-25) | | |
| 4 | `0xdAC17F958D2ee523a2206206994597C13D831ec7` | stablecoin address | USDT; liquidity "not checked" (quote asset), no meme flags | | |
| 5 | `PEPE` | memecoin | Ethereum PEPE, TWIN_TICKER, DexScreener liquidity shown | | |
| 6 | `WIF` | Solana memecoin | dogwifcoin, Solana pairs; holders "n/a (no free source)" | | |
| 7 | `https://www.coingecko.com/en/coins/dogwifcoin` | URL | same as 6 | | |
| 8 | a DexScreener "new pairs" URL from today | fresh pair | FRESH_PAIR, LOW_LIQUIDITY, listing age in days | | |
| 9 | raw contract address of row 8 | fresh pair | same brief as 8 | | |
| 10 | `https://coinmarketcap.com/currencies/pepe/` | URL | same token as 5 | | |
| 11 | `ARB` | twin ticker | Arbitrum on arbitrum (or the picker if caps are close) — never a Solana clone (D-16) | | |
| 12 | `asdfqwerty` · `0x1234` · `hello world` · empty | invalid | not found · input hint (D-20) · input hint · button disabled; no spinner hang, no stack trace | | |
| 13 | 6+ new tickers within a minute | rate limit | countdown "retrying in N s" then the brief; never a wrong token or "not found" (D-16–D-19) | | |

Mobile rows (apps/app-mobile.md): no horizontal scroll at 320 px · safe areas · touch targets
≥ 44 × 44 · no hover-only actions ("Why?" is a button) · no geometry calls · no viewport meta.
