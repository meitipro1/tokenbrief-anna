# S3 — synthesis and UI

Verified in `anna-app dev` (mock LLM) on 2026-09-25:

- PEPE end-to-end: resolve → metrics ∥ pairs → flags → llm.complete (mock) → validate →
  substitute; every rendered number matches the FACTS map (numbers table rendered by code).
- NOTATOKEN123 → "No coin with that ticker or name on CoinGecko. Try the contract address —
  addresses are also looked up on DexScreener." (D-23; the 2026-09-24 build said "…on
  CoinGecko or DexScreener", which stopped being true for tickers with D-16)
- فارسی toggle: chrome and flag messages in Persian, brief sections `dir="rtl"`, numbers table
  LTR with Latin digits (D-6).
- Mobile at 320 px (iframe forced to 320×568): no horizontal scroll, no overflowing element, all
  buttons/inputs ≥ 44×44; bundle has no `:hover` rules and no viewport meta; safe-area uses
  `--anna-safe-area-*` with `env(safe-area-inset-*)` fallback.
- Host API calls in the built bundle: tools.invoke, llm.complete, storage.get, storage.set,
  window.set_title — exactly the granted set.

To fill after `anna-app login` (P-9.12, real LLM):

| Run | First-try valid? | usage.totalTokens | Prose numbers == table? | Notes |
|---|---|---|---|---|
| PEPE | | | | |
| ARB | | | | |
| fresh Solana pair | | | | |
| NOTATOKEN123 | n/a | n/a | n/a | |
| FA toggle (PEPE) | | | | |
| follow-up | | | | |
