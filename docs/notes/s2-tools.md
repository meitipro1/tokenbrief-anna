# S2 — clients and tools: what the live APIs returned (2026-09-24/25 UTC)

Recorded with `TOKENBRIEF_EVIDENCE=1 TOKENBRIEF_EVIDENCE_DIR=evidence/<name> pnpm smoke --
<query> --record fixtures/tools/<name>.jsonl`; raw responses synced into
`executas/tokenbrief/test/fixtures/evidence/` by `scripts/fixtures-sync.ts`; replayed offline by
`test/replay.test.ts`.

| Fixture | Query | Result |
|---|---|---|
| pepe | `PEPE` | resolved `pepe` (twins Based Pepe, Pepe on SOL); flags TWIN_TICKER:warn, PAIR_CONCENTRATION:info |
| pepe-address | `0x6982…1933` | same token via DexScreener pairs → CoinGecko contract lookup on `ethereum` |
| pepe-cg-url | coingecko.com/en/coins/pepe | cgIdHint path, one `/coins/pepe` call |
| pepe-cmc-url | coinmarketcap.com/currencies/pepe/ | CMC slug as search term → `pepe` |
| arb | `ARB` | resolved `arbitrum` (dominant ≥ 20× over the next ARB); THIN_VS_CAP:warn |
| btc | `BTC` | resolved `bitcoin`, no contract → no pairs; PARTIAL_DATA (liquidity/pair rules not checked) |
| usdt-address | `0xdAC1…1ec7` | resolved `tether`; quote asset → liquidity rules skipped (D-8) |
| wif | `WIF` | resolved `dogwifcoin` on solana |
| wif-dex-url | dexscreener.com/solana/EP2i…eyMx | pair → base token EKpQ…zcjm → `dogwifcoin` |
| not-found | `NOTATOKEN123` | `not_found` (CoinGecko search empty), success:true |
| robin-fresh | dexscreener.com/solana/daxv…v1qm (lowercase, as users paste it) | ROBIN, pools hours old: FRESH_PAIR:high, LOW_LIQUIDITY:high, NO_VERIFIED_SOCIALS:high, TWIN_TICKER, PRICE_SPIKE, NO_CG_LISTING (404 confirmed), SELF_REPORTED_SOCIALS |

All fixtures were re-recorded on 2026-09-25 after the D-16…D-22 changes: PEPE now gives the
same brief (incl. TWIN_TICKER) whether pasted as a ticker, an address, a CoinGecko link or a
CMC link. 404 responses are recorded too, so replays see "not listed" the way the live run did.

Endpoint facts seen:

- CoinGecko keyless `/search`, `/coins/markets`, `/coins/{id}`, `/coins/{platform}/contract/{addr}`
  all answered 200. Measured budget: ~5 origin requests per minute per IP — the 6th returns 429
  with `Retry-After` counting down to the window end; Cloudflare `HIT`s do not count (D-17).
  `genesis_date` is null for PEPE → listing age derived from the oldest pair (2023-04-14).
- DexScreener `/token-pairs/v1/{chain}/{addr}` returns a **bare array** (≤ 30 pools) including
  pools where the token is only the quote; `/latest/dex/search` and `/latest/dex/pairs/…` wrap
  in `{pairs}`. Numbers arrive as strings or numbers. Windows `m5/h1/h6/h24` present.
- Timings (fresh process): resolve 0.5–4.6 s (CoinGecko spacing 2.1 s), metrics+pairs ≤ 6 s.
