# Notes for the Anna store reviewer — TokenBrief 0.1.0

**Primary function.** Generate a token brief — identity, live key numbers, risk flags,
narrative and share text — from a ticker, contract address, or CoinMarketCap/CoinGecko/
DexScreener URL.

**How to test (three inputs).**
1. `PEPE` → resolves Pepe on Ethereum; key numbers with source/time; TWIN_TICKER flag (other
   coins use the ticker); prose, 5 questions, share card; tap **فارسی** for Persian.
2. `https://dexscreener.com/solana/EP2ib6dYdEeqD8MfE2ezHCxX3kP3K2eLKkirfPm5eyMx` → the pair's
   base token (dogwifhat) on Solana.
3. `NOTATOKEN123` → "No coin with that ticker or name on CoinGecko. Try the contract
   address — addresses are also looked up on DexScreener."

**Data.** The bundled Executa "TokenBrief Data" (4 tools: resolve_token, fetch_metrics,
fetch_pairs, risk_flags) calls the keyless CoinGecko and DexScreener public APIs. It declares no
credentials. The UI never fetches external hosts; it calls only `tools.invoke`,
`llm.complete`, `storage.get/set` and `window.set_title`, exactly the granted `host_api`.
Numbers are rendered by code; the model writes placeholders that a validator checks.

**Mobile checklist (ui.form_factors includes "mobile").**

| Requirement | How it is satisfied |
|---|---|
| Usable at ≥ 320 px | Single responsive column; checked at 320×568: no horizontal scroll, no clipped controls |
| Safe areas | `body` padding uses `--anna-safe-area-*` with `env(safe-area-inset-*)` fallback |
| Touch targets ≥ 44×44 | All buttons/inputs use a 44 px minimum (checked in the 320 px layout) |
| No hover-only interactions | No `:hover` styles; the flag detail is a "Why?" button |
| No multi-window / geometry dependence | One view; no move/resize calls |
| No custom viewport meta | `bundle/index.html` has none |

**Known limits (stated in the listing).** Holder counts are not shown (no free source). The
honeypot signal is a hint (buys without sells over 24h), not a contract simulation.
Not financial advice.

**If you test many tickers quickly.** Keyless CoinGecko allows about 5 requests a minute per
IP, and a ticker brief uses 2–3. Past that the app shows "retrying in N s", waits exactly as
long as CoinGecko asks, and finishes on its own. It never guesses a token from DexScreener
search instead, because that search is full of look-alike clones. Contract addresses and
DexScreener links fall back to DexScreener data while CoinGecko is busy.

## Changes in 0.1.x

_(one line per reviewer note, added when a review round comes back)_
