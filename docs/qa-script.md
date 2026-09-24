# Manual QA inside Anna (roadmap §11.7) — run before `apps submit-review`

Run twice: desktop window, and mobile shell at 320 px (DevTools iPhone SE). Developer-account
runs are QA only and do not count toward MAU. For each row record time-to-brief, whether the
numbers match the source page (price within 2 %, market cap within 5 %), Persian readable (RTL,
Latin digits), copy pastes cleanly into Telegram, follow-up answers without re-fetching.

| # | Input | Class | Expected | Desktop | Mobile |
|---|---|---|---|---|---|
| 1 | `BTC` | major | Brief; no pair rules (PARTIAL_DATA "not checked: pairs null") | | |
| 2 | `ETH` | major | Brief; narrative mentions smart contracts / L1 | | |
| 3 | `SOL` | major + twins | Solana (rank), twins listed in TWIN_TICKER evidence | | |
| 4 | `0xdAC17F958D2ee523a2206206994597C13D831ec7` | stablecoin address | USDT; liquidity "not checked" (quote asset), no meme flags | | |
| 5 | `PEPE` | memecoin | Ethereum PEPE, TWIN_TICKER, DexScreener liquidity shown | | |
| 6 | `WIF` | Solana memecoin | dogwifcoin, Solana pairs; holders "n/a (no free source)" | | |
| 7 | `https://www.coingecko.com/en/coins/dogwifcoin` | URL | same as 6 | | |
| 8 | a DexScreener "new pairs" URL from today | fresh pair | FRESH_PAIR, LOW_LIQUIDITY, listing age in days | | |
| 9 | raw contract address of row 8 | fresh pair | same brief as 8 | | |
| 10 | `https://coinmarketcap.com/currencies/pepe/` | URL | same token as 5 | | |
| 11 | `ARB` | twin ticker | Arbitrum (or picker if caps are close); twins in evidence | | |
| 12 | `asdfqwerty`, `0x1234`, empty | invalid | friendly error, no spinner hang, no stack trace | | |

Mobile rows (apps/app-mobile.md): no horizontal scroll at 320 px · safe areas · touch targets
≥ 44 × 44 · no hover-only actions ("Why?" is a button) · no geometry calls · no viewport meta.
