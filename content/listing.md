# TokenBrief — store listing (Console → Listing tab; `anna-app apps sync-meta` pushes app.json)

Every claim below is something build 0.1.0 does on screen. Do not add "holders" (no free
source) or "honeypot detection" (only a no-sells hint; no contract simulation).

| Field | Value |
|---|---|
| Name | TokenBrief |
| Slug | `tokenbrief` (immutable) |
| Category | `data` |
| Tagline (≤ 160) | Paste a ticker, contract or link — get a live, sourced brief with risk flags. English and Persian. |
| Logo | `content/brand/logo-512.png` → **Upload logo** (stored as 256×256 WebP) |
| Cover | `https://tokenbrief-anna.vercel.app/brand/cover-1600x900.png` |
| Screenshots (≤ 6) | `https://tokenbrief-anna.vercel.app/shots/01-desktop-brief.png`, `…/02-desktop-flags.png`, `…/03-desktop-share.png`, `…/04-mobile-brief.png`, `…/05-mobile-persian.png` |
| Homepage | https://tokenbrief-anna.vercel.app |
| Support | https://t.me/meitipro |
| Privacy | https://tokenbrief-anna.vercel.app/privacy |

## Description (EN) — same text as app.json `description`

TokenBrief answers the question every crypto group asks ten times a day: "what is this token?"

Primary function: generate a token brief — identity, live key numbers, risk flags, narrative
and share text — from a ticker, contract address, or CoinMarketCap/CoinGecko/DexScreener URL.

Paste a ticker (PEPE), a contract address (0x… or a Solana mint), or a CoinGecko,
CoinMarketCap or DexScreener link. In a few seconds you get one structured brief:

- **Key numbers** — price, 24h change, market cap and FDV, 24h volume, DEX liquidity,
  market-cap rank and how long the token has been listed. Each number shows its source and
  fetch time.
- **Risk flags** — rule-based checks on free data: fresh pair, low liquidity, liquidity thin
  versus market cap, twin tickers (same symbol, different token), large FDV gap, missing
  verified socials, single pool, price spike, volume anomaly, and a honeypot hint when there
  are buys but no sells. Tap "Why?" on any flag to see the rule and the exact numbers behind it.
- **What it is, narrative snapshot and 5 questions to ask before buying** — written by the AI
  around the numbers.
- **Share card** — one tap copies a clean summary for X or Telegram.
- **Persian** — one tap switches the brief to Persian (فارسی); numbers stay in Latin digits so
  they match the sources.
- **Follow-up questions** about the brief, answered from the same data.

Every number comes from the CoinGecko and DexScreener public APIs at run time. The AI only
writes the words around the numbers and never invents figures; a validator rejects any number
it types. No API keys, no wallet, no sign-up beyond your Anna account.

Privacy: TokenBrief stores only your recent briefs and your language preference in Anna
storage. No personal data, no tracking.

TokenBrief is a research aid, not financial advice. Holder counts are not shown (no free source).

Support: Telegram @meitipro

## Description (FA) — paste under the English text

توکن‌بریف به سؤالی جواب می‌دهد که هر گروه کریپتویی روزی ده بار می‌پرسد: «این توکن چیست؟»

یک نماد (مثل PEPE)، یک آدرس قرارداد (0x… یا آدرس سولانا) یا لینک CoinGecko، CoinMarketCap یا
DexScreener را بچسبانید. در چند ثانیه یک بریف مرتب می‌گیرید: اعداد کلیدی (قیمت، تغییر 24h،
ارزش بازار و ارزش کاملاً رقیق‌شده، حجم، نقدینگی DEX، رتبه و مدت فهرست‌شدن) با منبع و زمان هر
عدد؛ پرچم‌های ریسک قاعده‌محور مثل جفت تازه، نقدینگی کم، نماد تکراری، شکاف FDV، نبودِ
شبکه‌های اجتماعی تأییدشده و نشانهٔ هانی‌پات وقتی خرید هست ولی فروش نیست؛ توضیح کوتاه، روایت
فعلی و پنج سؤالی که قبل از خرید باید بپرسید؛ و متن آماده برای اشتراک در X و تلگرام. با یک لمس
کل بریف فارسی می‌شود و اعداد با ارقام لاتین می‌مانند تا با منبع یکی باشند.

همهٔ اعداد در لحظه از API عمومی CoinGecko و DexScreener می‌آیند؛ هوش مصنوعی فقط متن اطراف اعداد
را می‌نویسد و هیچ عددی نمی‌سازد. بدون کلید API، بدون کیف پول. توصیهٔ مالی نیست.
