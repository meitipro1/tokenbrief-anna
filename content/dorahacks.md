# DoraHacks — Anna AI App Builder Program (hackathon 2349)

Page: https://dorahacks.io/hackathon/2349/detail · BUIDL deadline: Wed 30 Sep 2026 (the page
shows 19:29 in a Tehran browser = 15:59 UTC). Own cutoff: **30 Sep 12:00 UTC (15:30 Tehran)**.
You fill and submit both forms yourself; nothing here is submitted automatically.

Corrections to the roadmap's §12.7 copy so the BUIDL matches the app: no "holders" (no free
source), and the app does store your recent briefs and language preference (Anna storage).

## 1. Registration form (Sun 27 Sep)

| Field | Answer |
|---|---|
| App built and published on Anna? | Truthful status on the day, e.g. "TokenBrief — Anna App (schema 2, UI bundle + Executa), submitted for Anna store review on 26 Sep 2026, App `@meitipro1/tokenbrief`." After approval: the store link. |
| Contact email | the email on your Anna developer account |
| Anna account | your developer handle as shown in `/developer` (planned: `meitipro1`) |
| Discord username | your Discord handle after joining https://discord.gg/7ftTdsdMMz |

## 2. BUIDL

| Field | Copy |
|---|---|
| Project name | TokenBrief |
| One-liner | Paste a token — ticker, contract or link — and get a live, sourced brief with risk flags, in English or Persian. Runs inside Anna. |
| App link (required) | STORE_LINK (or, while pending, the Console app URL / App ID + the status note below) |
| Tags | anna, ai-app, crypto-research, token-analysis, persian |
| GitHub | https://github.com/meitipro1/tokenbrief-anna |
| Website | https://tokenbrief-anna.vercel.app |
| Demo video | the ~60-second recording made by `pnpm tsx scripts/demo-video.ts` from the real-LLM harness (shot list: content/launch/tutorial-60s.md), uploaded to YouTube (unlisted is fine) |
| Logo / cover | content/brand/logo-1024.png · content/brand/cover-1600x900.png |

### Description

TokenBrief — paste a token, get the brief (published on Anna: STORE_LINK)

Primary function: a signed-in user pastes a ticker, contract address or CoinGecko /
CoinMarketCap / DexScreener link and receives a structured brief: live key numbers (price, 24h
change, market cap, FDV, 24h volume, DEX liquidity, market-cap rank, listing age), rule-based
risk flags (fresh pair, low liquidity, liquidity thin versus market cap, twin tickers, FDV gap,
missing verified socials, single pool, price spike, volume anomaly, a no-sells honeypot hint),
what the token is, a narrative snapshot, 5 questions to ask before buying, and a share-ready
card for X/Telegram. One tap switches the brief to Persian.

How: a Node.js Executa (JSON-RPC over stdio, shipped as self-contained binaries) with four
tools — resolve_token, fetch_metrics, fetch_pairs, risk_flags — against the keyless CoinGecko
and DexScreener APIs, plus a React window that calls them through Anna's host API and writes
the prose with Anna's host LLM. Every number comes from the APIs; the model only writes {F1}-
style placeholders and a validator rejects any digit it types. No user API keys, no wallet;
the app stores only your recent briefs and language preference in Anna storage. Desktop and
mobile. Passed Anna store review on <date>.

Why it earns real usage: it answers the "what is this token?" question asked daily in the
crypto groups I moderate and in the Persian-speaking crypto community, where a bilingual,
sourced brief did not exist.

Growth log with every post and date:
https://github.com/meitipro1/tokenbrief-anna/blob/main/docs/growth-log.md

### Status note (only if the review is still pending on 30 Sep — paste above the description)

Status note (30 Sep): TokenBrief was submitted for Anna store review on 26 Sep 2026 (App
`@meitipro1/tokenbrief`, version 0.1.0, status PENDING_REVIEW). The store link will be added
here as soon as the review completes; the app is complete and runs end-to-end on the
developer account. Repo and landing page above.

## 3. Checklist

- [ ] Registration submitted (Sun 27 Sep) — screenshot to docs/evidence/
- [ ] BUIDL drafted Tue 29 Sep with everything except the link
- [ ] BUIDL submitted by 30 Sep 12:00 UTC with STORE_LINK or the status note
- [ ] After approval: `anna-app apps release 0.1.0`, verify PUBLISHED in a private window,
      edit the BUIDL link, `pnpm log:post -- <buidl url> dorahacks buidl en`
