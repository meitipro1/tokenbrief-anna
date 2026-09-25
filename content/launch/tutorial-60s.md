# 60-second tutorial — shot list (record from the published app; captions only, no voice needed)

| Time | Shot | Caption EN | Caption FA |
|---|---|---|---|
| 0:00–0:06 | App open, empty input | What is this token? Paste it. | این توکن چیه؟ بچسبونش. |
| 0:06–0:14 | Paste a DexScreener link → progress line → numbers table | Live numbers from CoinGecko + DexScreener, with the time. | اعداد زنده از CoinGecko و DexScreener، با ساعت. |
| 0:14–0:24 | Scroll to flags, tap "Why?" | Rule-based risk flags. Tap Why? for the evidence. | پرچم‌های ریسک؛ با «چرا؟» شواهد را ببین. |
| 0:24–0:32 | Scroll: what it is, narrative, 5 questions | The AI writes the words. Never the numbers. | هوش مصنوعی فقط متن را می‌نویسد، نه اعداد. |
| 0:32–0:40 | Tap Copy share card → paste into Telegram | One tap to share in your group. | با یک لمس برای گروه بفرست. |
| 0:40–0:48 | Tap فارسی | The whole brief in Persian. | کل بریف به فارسی. |
| 0:48–0:55 | Ask a follow-up | Ask about the same brief. | دربارهٔ همین بریف سؤال بپرس. |
| 0:55–1:00 | End card with logo | TokenBrief · inside Anna · not financial advice | توکن‌بریف · داخل Anna · توصیهٔ مالی نیست |

Checklist: recorded from the current build · real data with the timestamp visible · no token you
hold · captions readable muted.

Recording: `scripts/demo-video.ts` plays this shot list against the running harness and burns
in the captions above (read from this table), then writes
`screenshots/demo/tokenbrief-demo-<date>.webm` (1280×720; YouTube takes WebM, X needs MP4).
Record it with the real model (`anna-app dev --bundle bundle` while logged in): with
`--mock-llm` the prose is canned, the follow-up shot is skipped and the script says so.
