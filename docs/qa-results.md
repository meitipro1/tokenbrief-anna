# QA results — 2026-09-25 02:19 UTC

Driven through `anna-app dev` by `scripts/qa-run.ts` (§11.7 rows). LLM: whatever the harness was started with (mock unless noted), so prose is not assessed here — numbers, resolution, flags, errors, timing and layout are. Mobile layout is measured in the harness' 390 px shell and again with the iframe narrowed to 320 px.

## desktop — 2026-09-25 02:19 UTC

| # | Input | Outcome | Time | Resolved | Flags | Notice |
|---|---|---|---|---|---|---|
| 1 | `BTC` | brief | 1.4 s | Bitcoin $BTC | PARTIAL_DATA:info |  |
| 2 | `ETH` | brief | 2.4 s | Ethereum $ETH | PARTIAL_DATA:info |  |
| 3 | `SOL` | brief | 1.4 s | Solana $SOL | PARTIAL_DATA:info |  |
| 4 | `0xdAC17F958D2ee523a2206206994597C13D831ec7` | brief | 3.0 s | Tether $USDT · ethereum | PARTIAL_DATA:info |  |
| 5 | `PEPE` | brief | 2.5 s | Pepe $PEPE · ethereum | TWIN_TICKER:warn, PAIR_CONCENTRATION:info |  |
| 6 | `WIF` | brief | 56.3 s | dogwifhat $WIF · solana | PAIR_CONCENTRATION:info |  |
| 7 | `https://www.coingecko.com/en/coins/dogwifcoin` | brief | 0.1 s | dogwifhat $WIF · solana | PAIR_CONCENTRATION:info |  |
| 8 | `https://dexscreener.co…dzasymvqdqo8v1qm` | brief | 2.5 s | Robin Hood $ROBIN · solana | FRESH_PAIR:high, LOW_LIQUIDITY:high, NO_VERIFIED_SOCIALS:high, TWIN_TICKER:warn, PRICE_SPIKE:warn, NO_CG_LISTING:warn, SELF_REPORTED_SOCIALS:info |  |
| 9 | `BozphR8Ehb4zxLKYSh9aPApaZnLN5QiDs8KXjtnB4sEG` | brief | 0.9 s | Robin Hood $ROBIN · solana | FRESH_PAIR:high, LOW_LIQUIDITY:high, NO_VERIFIED_SOCIALS:high, TWIN_TICKER:warn, PRICE_SPIKE:warn, NO_CG_LISTING:warn, SELF_REPORTED_SOCIALS:info |  |
| 10 | `https://coinmarketcap.com/currencies/pepe/` | brief | 0.9 s | Pepe $PEPE · ethereum | TWIN_TICKER:warn, PAIR_CONCENTRATION:info |  |
| 11 | `ARB` | brief | 1.9 s | Arbitrum $ARB · arbitrum | THIN_VS_CAP:warn |  |
| 12a | `asdfqwerty` | error: No coin with that ticker or name on CoinGecko. Try the contract address — addresses are also looked up on DexScreener. | 11.3 s |  |  |  |
| 12b | `0x1234` | error: Paste a ticker, a contract address, or a CoinGecko/CMC/DexScreener link. | 0.1 s |  |  |  |
| 12c | `hello world` | error: Paste a ticker, a contract address, or a CoinGecko/CMC/DexScreener link. | 0.1 s |  |  |  |
| 12d | `(empty)` | no-op (button disabled) | — |  |  |  |

## mobile — 2026-09-25 02:19 UTC

| # | Input | Outcome | Time | Resolved | Flags | Notice | Layout |
|---|---|---|---|---|---|---|---|
| 1 | `BTC` | brief | 0.1 s | Bitcoin $BTC | PARTIAL_DATA:info |  | w=390 hscroll=no overflow=0 small-targets=0 · w=320 hscroll=no overflow=0 small-targets=0 |
| 2 | `ETH` | brief | 1.4 s | Ethereum $ETH | PARTIAL_DATA:info |  | w=390 hscroll=no overflow=0 small-targets=0 · w=320 hscroll=no overflow=0 small-targets=0 |
| 3 | `SOL` | brief | 0.9 s | Solana $SOL | PARTIAL_DATA:info |  | w=390 hscroll=no overflow=0 small-targets=0 · w=320 hscroll=no overflow=0 small-targets=0 |
| 4 | `0xdAC17F958D2ee523a2206206994597C13D831ec7` | brief | 0.9 s | Tether $USDT · ethereum | PARTIAL_DATA:info |  | w=390 hscroll=no overflow=0 small-targets=0 · w=320 hscroll=no overflow=0 small-targets=0 |
| 5 | `PEPE` | brief | 0.9 s | Pepe $PEPE · ethereum | TWIN_TICKER:warn, PAIR_CONCENTRATION:info |  | w=390 hscroll=no overflow=0 small-targets=0 · w=320 hscroll=no overflow=0 small-targets=0 |
| 6 | `WIF` | brief | 0.9 s | dogwifhat $WIF · solana | PAIR_CONCENTRATION:info |  | w=390 hscroll=no overflow=0 small-targets=0 · w=320 hscroll=no overflow=0 small-targets=0 |
| 7 | `https://www.coingecko.com/en/coins/dogwifcoin` | brief | 0.1 s | dogwifhat $WIF · solana | PAIR_CONCENTRATION:info |  | w=390 hscroll=no overflow=0 small-targets=0 · w=320 hscroll=no overflow=0 small-targets=0 |
| 8 | `https://dexscreener.co…dzasymvqdqo8v1qm` | brief | 0.9 s | Robin Hood $ROBIN · solana | FRESH_PAIR:high, LOW_LIQUIDITY:high, NO_VERIFIED_SOCIALS:high, TWIN_TICKER:warn, PRICE_SPIKE:warn, NO_CG_LISTING:warn, SELF_REPORTED_SOCIALS:info |  | w=390 hscroll=no overflow=0 small-targets=0 · w=320 hscroll=no overflow=0 small-targets=0 |
| 9 | `BozphR8Ehb4zxLKYSh9aPApaZnLN5QiDs8KXjtnB4sEG` | brief | 0.1 s | Robin Hood $ROBIN · solana | FRESH_PAIR:high, LOW_LIQUIDITY:high, NO_VERIFIED_SOCIALS:high, TWIN_TICKER:warn, PRICE_SPIKE:warn, NO_CG_LISTING:warn, SELF_REPORTED_SOCIALS:info |  | w=390 hscroll=no overflow=0 small-targets=0 · w=320 hscroll=no overflow=0 small-targets=0 |
| 10 | `https://coinmarketcap.com/currencies/pepe/` | brief | 0.1 s | Pepe $PEPE · ethereum | TWIN_TICKER:warn, PAIR_CONCENTRATION:info |  | w=390 hscroll=no overflow=0 small-targets=0 · w=320 hscroll=no overflow=0 small-targets=0 |
| 11 | `ARB` | brief | 1.4 s | Arbitrum $ARB · arbitrum | THIN_VS_CAP:warn |  | w=390 hscroll=no overflow=0 small-targets=0 · w=320 hscroll=no overflow=0 small-targets=0 |
| 12a | `asdfqwerty` | error: No coin with that ticker or name on CoinGecko. Try the contract address — addresses are also looked up on DexScreener. | 0.1 s |  |  |  | w=390 hscroll=no overflow=0 small-targets=0 · w=320 hscroll=no overflow=0 small-targets=0 |
| 12b | `0x1234` | error: Paste a ticker, a contract address, or a CoinGecko/CMC/DexScreener link. | 0.0 s |  |  |  | w=390 hscroll=no overflow=0 small-targets=0 · w=320 hscroll=no overflow=0 small-targets=0 |
| 12c | `hello world` | error: Paste a ticker, a contract address, or a CoinGecko/CMC/DexScreener link. | 0.1 s |  |  |  | w=390 hscroll=no overflow=0 small-targets=0 · w=320 hscroll=no overflow=0 small-targets=0 |
| 12d | `(empty)` | no-op (button disabled) | — |  |  |  |  |
