# TokenBrief — paste a token, get the brief

An [Anna](https://anna.partners) App. Enter a ticker, a contract address, or a CoinGecko /
CoinMarketCap / DexScreener link and get a structured, sourced brief in seconds: key numbers,
rule-based risk flags, what the token is, a narrative snapshot, five questions to ask before
buying, a share-ready card for X/Telegram, and a Persian version.

Runs inside Anna: _store link after approval_ · Landing: https://tokenbrief-anna.vercel.app ·
Support: https://t.me/meitipro

## What it does (the primary function)

**Generate a token brief — identity, live key numbers, risk flags, narrative and share text —
from a ticker, contract address, or CoinMarketCap/CoinGecko/DexScreener URL.**

One run = one brief: the token is resolved, live metrics and DEX pairs are fetched, the risk
rules run, and the model writes the prose around the numbers. If resolution or both data
sources fail, the run ends with an explicit error, not an empty brief. If the model is
unavailable or its output fails validation twice, a data-only template brief is shown.

Inputs: ticker (`PEPE`, `$pepe`), EVM address (`0x…`), Solana mint, CoinGecko coin URL,
CoinMarketCap currency URL, DexScreener pair URL. When several coins share a ticker and none
dominates by market cap, a picker lists them.

Tickers are resolved through CoinGecko only — never by "the deepest DexScreener pool", because
DexScreener search is full of clones with fake liquidity (a days-old Solana "Arbitrum" showed
$207M). Keyless CoinGecko allows about 5 requests a minute, so when it is busy the app counts
down the wait CoinGecko asks for and retries; contract addresses and DexScreener links work
without it.

## The one rule: numbers never come from the model

The Executa returns every number with its source and fetch time. The UI sends the model a FACTS
map (`F1` price, `F2` 24h change, … `F14+` flags) and the model may only write placeholders like
`{F1}`. A validator rejects any output containing a digit outside a placeholder (Persian digits
included), unknown placeholders, or a schema mismatch; one corrective retry, then the template
brief. The numbers table, flags and share numbers are rendered by code from the same FACTS.

## Data sources

| Source | Used for | Auth |
|---|---|---|
| CoinGecko public API | search, coin data, markets, contract lookup | none |
| DexScreener public API | pairs, liquidity, pair age, buys/sells | none |

## Risk flags (rule-based, from free data)

FRESH_PAIR · LOW_LIQUIDITY · THIN_VS_CAP · TWIN_TICKER · FDV_MC_GAP · NO_VERIFIED_SOCIALS ·
SELF_REPORTED_SOCIALS · SINGLE_PAIR · PAIR_CONCENTRATION · PRICE_SPIKE · VOLUME_ANOMALY ·
NO_SELLS (honeypot hint) · SELL_PRESSURE · NO_CG_LISTING · PARTIAL_DATA ("not checked" list).
Thresholds: `executas/tokenbrief/src/clients/config.ts`. Each flag shows its rule and evidence.
Holder counts are not shown: there is no free keyless source.

## How it works

```text
UI bundle (React/Vite, sandboxed iframe)
  ├─ tools.invoke ─▶ Executa "tokenbrief" (Node, JSON-RPC 2.0 over stdio, on the user's Anna Agent)
  │                   resolve_token → fetch_metrics ∥ fetch_pairs → risk_flags
  │                   └─ HTTPS ─▶ api.coingecko.com, api.dexscreener.com (keyless)
  └─ llm.complete ─▶ Anna host LLM (user credits / BYOK) → validated {F#} prose → substituted
```

The Executa ships as self-contained binaries (Node embedded) through Anna's `binary`
distribution; the manifest references it as `bundled:tokenbrief` and `anna-app apps publish`
mints its tool id.

## Run locally

```bash
pnpm install
pnpm build                          # executa → dist/, ui → bundle/
pnpm smoke -- PEPE                  # the 4 tools over real JSON-RPC against the live APIs
LLM_MODE=mock pnpm dev              # anna-app dev harness at http://localhost:5180
pnpm --filter ui dev                # UI alone with recorded data (no Anna host)
```

## Tests

```bash
pnpm test                           # risk table, http layer + rate budget, resolver, metrics,
                                    # stdio protocol, 11 recorded live chains replayed offline
                                    # (incl. a fresh Solana pair), validator, substitution,
                                    # share card, rate-limit countdown, mountBundle ACL tests
pnpm tsx scripts/qa-run.ts          # §11.7 QA rows through the anna-app dev harness → docs/qa-results.md
bash scripts/record-fixtures.sh     # re-record the live fixtures (spaced for CoinGecko's budget)
pnpm release:check                  # + typecheck, anna-app validate --strict, bundle rules
pnpm release:verify                 # the Executa binaries embed the current code (gate before apps cut)
```

## Publish

After `anna-app login --host https://nexus.anna.partners`, `pnpm store:submit` walks the store
submission (docs/notes/s4-publish.md): local gates and a dry run first, then push, sync-meta,
cut and submit-review, each only after you confirm.

## Repository layout

```text
manifest.json         Anna App manifest (schema 2; desktop + mobile)
app.json              listing metadata + bundled_executas
executas/tokenbrief/  Executa: tools, API clients, cache, rate limiter, risk rules, tests
ui/                   React source → bundle/ (static SPA)
fixtures/             recorded tool chains (tools/) and the mock LLM reply (llm/)
scripts/              smoke, manifest, release-check, growth-log helpers
docs/                 anna-facts, decisions, notes, QA script, growth log
content/              listing copy, review notes, launch posts
landing/              static landing page (EN/FA) for Vercel
```

## Privacy

No API keys, wallets or sign-ins are requested. The app stores only your recent briefs and your
language preference in Anna storage (`brief/*`, `recent`, `prefs/lang`). No analytics, no
per-user identifiers in logs.

## Acquisition proof

`docs/growth-log.md` records every post, link and date (`pnpm log:post`), plus weekly
checkpoints (`pnpm checkpoint`). It is what we show Anna if usage is ever questioned; the
helper refuses incentive wording because paying or incentivising runs is prohibited.

## Disclaimer

TokenBrief is a research aid, not financial advice. Data may be delayed or wrong at the source;
always verify before acting.

## Author

Mahdi — GitHub @meitipro1 · X @meitipro1 · Telegram @meitipro. MIT License.
