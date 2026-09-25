# QA results — 2026-09-25 01:05 UTC

Driven through `anna-app dev` by `scripts/qa-run.ts` (§11.7 rows). LLM: whatever the harness was started with (mock unless noted), so prose is not assessed here — numbers, resolution, flags, errors, timing and layout are.

## desktop

| # | Input | Outcome | Time | Resolved | Flags | Notice |
|---|---|---|---|---|---|---|
| 1 | `BTC` | brief | 5.1 s | Bitcoin $BTC | INFO, PARTIAL_DATA |  |
| 2 | `ETH` | brief | 5.1 s | Ethereum $ETH | INFO, PARTIAL_DATA |  |
| 3 | `SOL` | brief | 5.0 s | Solana $SOL | INFO, PARTIAL_DATA |  |
| 4 | `0xdAC17F958D2ee523a2206206994597C13D831ec7` | brief | 8.1 s | Tether $USDT · ethereum | INFO, PARTIAL_DATA |  |
| 5 | `PEPE` | error: Data source is rate-limited; try again in a minute. | 10.8 s |  |  |  |
| 6 | `WIF` | brief | 1.5 s | World is Flat $WIF · other | WARN, LOW_LIQUIDITY, INFO, SELF_REPORTED_SOCIALS, INFO, PARTIAL_DATA | WARN |
| 7 | `https://www.coingecko.com/en/coins/dogwifcoin` | error: No token found on CoinGecko or DexScreener. Try the contract address. | 0.9 s |  |  |  |
| 8 | `https://dexscreener.co…dzasymvqdqo8v1qm` | brief | 0.9 s | Robin Hood $ROBIN · solana | HIGH, FRESH_PAIR, HIGH, LOW_LIQUIDITY, WARN, PRICE_SPIKE, INFO, SELF_REPORTED_SOCIALS, INFO, PARTIAL_DATA | WARN |
| 9 | `BozphR8Ehb4zxLKYSh9aPApaZnLN5QiDs8KXjtnB4sEG` | brief | 0.9 s | Robin Hood $ROBIN · solana | HIGH, FRESH_PAIR, HIGH, LOW_LIQUIDITY, WARN, PRICE_SPIKE, INFO, SELF_REPORTED_SOCIALS, INFO, PARTIAL_DATA | WARN |
| 10 | `https://coinmarketcap.com/currencies/pepe/` | error: Data source is rate-limited; try again in a minute. | 6.6 s |  |  |  |
| 11 | `ARB` | brief | 1.4 s | Arbitrum $ARB · solana | HIGH, FRESH_PAIR, WARN, SINGLE_PAIR, INFO, PARTIAL_DATA | WARN |
| 12a | `asdfqwerty` | error: No token found on CoinGecko or DexScreener. Try the contract address. | 0.9 s |  |  |  |
| 12b | `0x1234` | error: No token found on CoinGecko or DexScreener. Try the contract address. | 0.9 s |  |  |  |
| 12c | `hello world` | error: Paste a ticker, a contract address, or a CoinGecko/CMC/DexScreener link. | 0.1 s |  |  |  |
| 12d | `(empty)` | no-op (button disabled) | — |  |  |  |

## mobile

| # | Input | Outcome | Time | Resolved | Flags | Notice | Layout |
|---|---|---|---|---|---|---|---|
| 1 | `BTC` | brief | 0.1 s | Bitcoin $BTC | INFO, PARTIAL_DATA |  | w=390 hscroll=no overflow=0 small-targets=0 |
| 2 | `ETH` | brief | 0.9 s | Ethereum $ETH | INFO, PARTIAL_DATA |  | w=390 hscroll=no overflow=0 small-targets=0 |
| 3 | `SOL` | brief | 0.9 s | Solana $SOL | INFO, PARTIAL_DATA |  | w=390 hscroll=no overflow=0 small-targets=0 |
| 4 | `0xdAC17F958D2ee523a2206206994597C13D831ec7` | brief | 0.9 s | Tether $USDT · ethereum | INFO, PARTIAL_DATA |  | w=390 hscroll=no overflow=0 small-targets=0 |
| 5 | `PEPE` | brief | 1.0 s | Pepe $PEPE | WARN, TWIN_TICKER, INFO, PARTIAL_DATA | WARN | w=390 hscroll=no overflow=0 small-targets=0 |
| 6 | `WIF` | brief | 3.6 s | World is Flat $WIF · other | HIGH, NO_VERIFIED_SOCIALS, WARN, LOW_LIQUIDITY, WARN, TWIN_TICKER, WARN, NO_CG_LISTING, INFO, SELF_REPORTED_SOCIALS | WARN | w=390 hscroll=no overflow=0 small-targets=0 |
| 7 | `https://www.coingecko.com/en/coins/dogwifcoin` | error: No token found on CoinGecko or DexScreener. Try the contract address. | 0.1 s |  |  |  | w=390 hscroll=no overflow=0 small-targets=0 |
| 8 | `https://dexscreener.co…dzasymvqdqo8v1qm` | brief | 5.0 s | Robin Hood $ROBIN · solana | HIGH, FRESH_PAIR, HIGH, LOW_LIQUIDITY, HIGH, NO_VERIFIED_SOCIALS, WARN, TWIN_TICKER, WARN, PRICE_SPIKE, WARN, NO_CG_LISTING, INFO, SELF_REPORTED_SOCIALS | WARN | w=390 hscroll=no overflow=0 small-targets=0 |
| 9 | `BozphR8Ehb4zxLKYSh9aPApaZnLN5QiDs8KXjtnB4sEG` | brief | 0.2 s | Robin Hood $ROBIN · solana | HIGH, FRESH_PAIR, HIGH, LOW_LIQUIDITY, HIGH, NO_VERIFIED_SOCIALS, WARN, TWIN_TICKER, WARN, PRICE_SPIKE, WARN, NO_CG_LISTING, INFO, SELF_REPORTED_SOCIALS | WARN | w=390 hscroll=no overflow=0 small-targets=0 |
| 10 | `https://coinmarketcap.com/currencies/pepe/` | brief | 0.2 s | Pepe $PEPE | WARN, TWIN_TICKER, INFO, PARTIAL_DATA | WARN | w=390 hscroll=no overflow=0 small-targets=0 |
| 11 | `ARB` | brief | 3.5 s | Arbitrum $ARB · solana | HIGH, FRESH_PAIR, HIGH, NO_VERIFIED_SOCIALS, WARN, TWIN_TICKER, WARN, SINGLE_PAIR, WARN, NO_CG_LISTING, INFO, PARTIAL_DATA | WARN | w=390 hscroll=no overflow=0 small-targets=0 |
| 12a | `asdfqwerty` | error: No token found on CoinGecko or DexScreener. Try the contract address. | 0.1 s |  |  |  | w=390 hscroll=no overflow=0 small-targets=0 |
| 12b | `0x1234` | error: No token found on CoinGecko or DexScreener. Try the contract address. | 0.1 s |  |  |  | w=390 hscroll=no overflow=0 small-targets=0 |
| 12c | `hello world` | error: Paste a ticker, a contract address, or a CoinGecko/CMC/DexScreener link. | 0.1 s |  |  |  | w=390 hscroll=no overflow=0 small-targets=0 |
| 12d | `(empty)` | no-op (button disabled) | — |  |  |  |  |
