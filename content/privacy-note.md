# TokenBrief — privacy

**What is sent where.** The text you paste (a ticker, contract address or link) goes from the
TokenBrief window to Anna, which runs the TokenBrief data tool on your Anna Agent. The tool
queries the public CoinGecko and DexScreener APIs with that token identifier only. The
resulting numbers and flags are sent to Anna's language model (your own Anna model settings and
credits) to write the brief's text.

**What is stored.** Your recent briefs and your language preference, in Anna's per-app storage
for your account (keys `brief/*`, `recent`, `prefs/lang`). Nothing is stored anywhere else.

**What is not collected.** No API keys, wallets, seed phrases, contact details or analytics.
The data tool's logs record only which tool ran, how long it took and whether it succeeded.

Contact: Telegram @meitipro

---

**حریم خصوصی.** متنی که می‌چسبانید (نماد، آدرس یا لینک) از پنجرهٔ توکن‌بریف به Anna می‌رود و
ابزار دادهٔ توکن‌بریف روی Anna Agent شما فقط با همان شناسهٔ توکن از API عمومی CoinGecko و
DexScreener داده می‌گیرد. اعداد و پرچم‌ها برای نوشتن متن بریف به مدل زبانی Anna (با تنظیمات و
اعتبار خودتان) فرستاده می‌شوند. فقط بریف‌های اخیر و زبان انتخابی شما در حافظهٔ مخصوص این برنامه
در حساب Anna ذخیره می‌شود. هیچ کلید API، کیف پول، اطلاعات تماس یا آماری جمع نمی‌شود.
