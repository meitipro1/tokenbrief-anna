# Discord post (≤ 900 chars) — Anna builders/showcase channel, Sat 3 Oct

TokenBrief is live on Anna (published <date>): paste a ticker, contract address or
CoinGecko/CMC/DexScreener link and get a sourced brief — key numbers with source and time,
rule-based risk flags with the evidence behind each, 5 questions to ask, a share card, and a
Persian version. Desktop + mobile.

Built as a Node Executa (4 tools over JSON-RPC, keyless CoinGecko + DexScreener, shipped as
self-contained binaries through the `binary` distribution) plus a React window that calls
`tools.invoke` and `llm.complete`. The model only writes `{F#}` placeholders; a validator
rejects any number it types.

Try it: <store link> · how it's built: https://github.com/meitipro1/tokenbrief-anna

Feedback on the flags and the Persian output is very welcome.

https://tokenbrief-anna.vercel.app/?utm_source=discord-anna&utm_medium=post&utm_campaign=launch-w1

---

- [ ] Asks for feedback, not for runs · link has UTM · no incentive language
