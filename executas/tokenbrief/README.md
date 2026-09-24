# @meitipro1/tokenbrief-executa

The data side of [TokenBrief](https://github.com/meitipro1/tokenbrief-anna), an Anna App: an
[Executa](https://anna.partners/developers/tools/executa-intro) plugin (JSON-RPC 2.0 over
stdio) with four tools.

| Tool | Input | Output |
|---|---|---|
| `resolve_token` | `query`: ticker, EVM/Solana address, or CoinGecko / CoinMarketCap / DexScreener URL | `resolved` / `ambiguous` (candidates) / `not_found` |
| `fetch_metrics` | `cgId?`, `chain?`, `address?`, `symbol` | price, 24h change, market cap, FDV, volume, DEX liquidity, supply, ATH, listing age, socials, same-ticker coins — each value with its source and fetch time |
| `fetch_pairs` | `chain?`, `address` | top DexScreener pools by liquidity, pools seen, oldest pool |
| `risk_flags` | `metrics`, `pairs?` | rule-based flags (fresh pair, low liquidity, twin ticker, FDV gap, missing socials, single pool, price spike, volume anomaly, no sells, …) with the exact evidence |

Data comes from the keyless CoinGecko and DexScreener public APIs. No credentials, no
telemetry; stderr carries one line per invoke (tool, duration, success) and nothing about the
user. Not financial advice.

```bash
pnpm build
echo '{"jsonrpc":"2.0","id":1,"method":"describe"}' | node dist/plugin.js
pnpm package:binaries   # self-contained binaries for the Anna `binary` distribution
```

MIT License.
