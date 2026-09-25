# TokenBrief — FAQ (EN + FA)

Every answer describes build 0.1.0 as it behaves. Corrections to the roadmap's §12.6 draft:
no "sell-tax signals" (the honeypot hint is buys-without-sells), and recent briefs *are* kept
in Anna storage. The landing page renders the same questions.

## English

**Is it free?** TokenBrief charges nothing. The data comes from free public APIs; the AI text
uses the model credits of your Anna account (or your own model key connected in Anna).

**What can I paste?** A ticker (`WIF`, `$PEPE`), an EVM contract address (`0x…`), a Solana
mint, or a CoinGecko, CoinMarketCap or DexScreener link.

**Where do the numbers come from?** CoinGecko and DexScreener public APIs, fetched when you
press Brief. Each number shows its source and fetch time. The AI never writes numbers: it can
only refer to them, and a validator rejects any digit it types.

**Why does it say "twin tickers"?** Other listed coins use the same symbol. TokenBrief picks
the coin whose market cap is at least 20 times the next one; otherwise it asks you to pick.
Always check the contract address before you act.

**What is a "fresh pair" flag?** The token's first trading pool was created recently: under
7 days is a high flag, under 30 days a warning. It is a warning, not a verdict.

**Can it tell me if a token is a honeypot?** Only a hint from free data: many buys and no
sells over the last day. It cannot simulate a sale — check with a dedicated tool before
buying anything flagged.

**Why does it say "retrying in N s"?** CoinGecko's free API allows only a few requests per
minute. TokenBrief waits exactly as long as CoinGecko asks and tries again. A contract address
or DexScreener link works even while CoinGecko is busy.

**Why is there no holder count?** No free source provides it without an API key, so the brief
shows "n/a" instead of guessing.

**Is this financial advice?** No. It is a research brief; the five questions are there so you
do your own work.

**Does it store my searches or my wallet?** No wallet is ever connected. TokenBrief keeps your
recent briefs (to reopen them) and your language choice in Anna storage for your account —
nothing else, and no analytics.

**Why is the Persian version slightly different?** It is a translation of the same brief.
Numbers stay in Latin digits so they match the sources.

**Does it work on my phone?** Yes — it is built for the Anna mobile app and works from 320 px
wide.

## فارسی

**رایگان است؟** توکن‌بریف هزینه‌ای ندارد. داده از API عمومی و رایگان می‌آید؛ متن هوش مصنوعی از
اعتبار مدلِ حساب Anna شما (یا کلید مدلی که خودتان در Anna وصل کرده‌اید) استفاده می‌کند.

**چه چیزی می‌توانم بچسبانم؟** نماد (`WIF`، `$PEPE`)، آدرس قرارداد EVM (`0x…`)، آدرس توکن سولانا،
یا لینک CoinGecko، CoinMarketCap یا DexScreener.

**اعداد از کجا می‌آیند؟** از API عمومی CoinGecko و DexScreener، همان لحظه‌ای که «بریف» را
می‌زنید. منبع و زمان هر عدد نمایش داده می‌شود. هوش مصنوعی هیچ عددی نمی‌نویسد و هر رقمی که
بنویسد رد می‌شود.

**«نماد تکراری» یعنی چه؟** کوین‌های فهرست‌شدهٔ دیگری هم از همین نماد استفاده می‌کنند. توکن‌بریف
کوینی را انتخاب می‌کند که ارزش بازارش دست‌کم ۲۰ برابر بعدی باشد؛ وگرنه از شما می‌پرسد. پیش از هر
کاری آدرس قرارداد را بررسی کنید.

**پرچم «جفت تازه» یعنی چه؟** نخستین استخر معاملاتی توکن تازه ساخته شده: کمتر از ۷ روز پرچم بالا
و کمتر از ۳۰ روز هشدار است. هشدار است، نه حکم.

**می‌تواند بگوید توکنی هانی‌پات است؟** فقط یک نشانه از داده‌های رایگان: خرید زیاد و هیچ فروشی در
روز گذشته. فروش را شبیه‌سازی نمی‌کند — پیش از خرید با ابزار تخصصی بررسی کنید.

**چرا می‌گوید «تلاش دوباره تا N ثانیه دیگر»؟** API رایگان CoinGecko فقط چند درخواست
در دقیقه می‌پذیرد. توکن‌بریف همان‌قدر که CoinGecko می‌خواهد صبر می‌کند و دوباره امتحان می‌کند.
آدرس قرارداد یا لینک DexScreener حتی وقتی CoinGecko شلوغ است کار می‌کند.

**چرا تعداد دارندگان را نشان نمی‌دهد؟** هیچ منبع رایگانی بدون کلید API آن را نمی‌دهد، پس به جای
حدس، «نامشخص» نمایش داده می‌شود.

**این توصیهٔ مالی است؟** نه. یک بریف تحقیقاتی است؛ پنج سؤال برای این است که خودتان بررسی کنید.

**جست‌وجوها یا کیف پولم را ذخیره می‌کند؟** هیچ کیف پولی وصل نمی‌شود. توکن‌بریف فقط بریف‌های اخیر
(برای باز کردن دوباره) و زبان انتخابی شما را در حافظهٔ Anna حساب خودتان نگه می‌دارد — نه چیز دیگر
و بدون هیچ آماری.

**چرا نسخهٔ فارسی کمی متفاوت است؟** ترجمهٔ همان بریف است. اعداد با ارقام لاتین می‌مانند تا با
منبع یکی باشند.

**روی گوشی کار می‌کند؟** بله — برای اپ موبایل Anna ساخته شده و از عرض ۳۲۰ پیکسل کار می‌کند.
