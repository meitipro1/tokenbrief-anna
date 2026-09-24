# X launch thread (EN) — post Thu 1 Oct 14:00 UTC, pin it. Do not post before the store link works.

Replace `LANDING` with https://tokenbrief-anna.vercel.app. Each tweet ≤ 260 chars (checked by
`pnpm tsx scripts/check-copy.ts`). Attach media where marked.

---

1/
Every crypto group gets the same question ten times a day: "what is this token?"

I built TokenBrief: paste a ticker, contract or DexScreener link and get the brief in seconds, right inside Anna.

LANDING/?utm_source=x&utm_medium=thread&utm_campaign=launch-w1

---

2/
What you get: key numbers (price, 24h, market cap, FDV, volume, DEX liquidity, listing age), rule-based risk flags, what the token is, 5 questions to ask before buying, and a share card for X/Telegram. [GIF]

---

3/
The rule I care about most: every number comes from CoinGecko and DexScreener at run time, with a timestamp. The AI only writes the words around them; a validator rejects any number it types. [screenshot 01]

---

4/
Flags that matter: fresh pair, low liquidity, twin tickers (same symbol, different token), FDV gap, missing verified socials, single pool, buys-without-sells hint. Tap "Why?" to see the rule and the numbers. [screenshot 02]

---

5/
فارسی: one tap switches the whole brief to Persian. Numbers stay in Latin digits so they match the sources. [screenshot 05]

---

6/
Try it in 3 steps: sign up at anna.partners → install TokenBrief from the Anna App Store → paste a token. Works on phone too.

Not financial advice. It is there so you do your own research faster.

---

7/
Built on Anna's app platform: a Node Executa for the data tools and a React window, shipped this week with Claude Code. Code: https://github.com/meitipro1/tokenbrief-anna

Reply with a token you want briefed; I'll post the most requested one on Sunday.

---

- [ ] Links open and carry utm_source=x
- [ ] No incentive language (no giveaway, reward, "run it to win")
- [ ] "Not financial advice" present (tweet 6)
- [ ] Media attached from the current build
