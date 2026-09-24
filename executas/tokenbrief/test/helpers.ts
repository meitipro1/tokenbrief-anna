// executas/tokenbrief/test/helpers.ts — a routed fake fetch: the first route whose substring
// occurs in the URL answers; anything else is a 404. Records every URL it saw.
import { vi } from "vitest";
import { clearHttpCache } from "../src/clients/http.js";
import { resetLimiter } from "../src/clients/limiter.js";
import { clearResolveCache } from "../src/tools/resolve.js";

export type Route = [match: string, body: unknown, status?: number];

export function routeFetch(routes: Route[]) {
  clearHttpCache();
  clearResolveCache();
  resetLimiter();
  const seen: string[] = [];
  const fake = vi.fn(async (input: string | URL) => {
    const url = String(input);
    seen.push(url);
    const hit = routes.find(([m]) => url.includes(m));
    if (!hit) return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
    return new Response(JSON.stringify(hit[1]), { status: hit[2] ?? 200 });
  });
  vi.stubGlobal("fetch", fake);
  return { fake, seen };
}

export const cgCoin = (id: string, symbol: string, o: Record<string, unknown> = {}) => ({
  id, symbol, name: id.toUpperCase(), asset_platform_id: "ethereum",
  platforms: { ethereum: `0x${"1".repeat(40)}` }, categories: ["Meme"], genesis_date: null,
  market_cap_rank: 30, description: { en: "<p>A <b>meme</b> coin.</p>" },
  links: { homepage: ["https://example.org", ""], twitter_screen_name: id,
    telegram_channel_identifier: "", chat_url: ["https://discord.gg/x"],
    repos_url: { github: [] } },
  market_data: { current_price: { usd: 0.00001234 }, market_cap: { usd: 5.1e9 },
    fully_diluted_valuation: { usd: 5.1e9 }, total_volume: { usd: 8.12e8 },
    price_change_percentage_24h: -3.2, ath: { usd: 0.00002 },
    ath_change_percentage: { usd: -40 }, circulating_supply: 4.2e14,
    total_supply: 4.2e14, max_supply: 4.2e14 },
  ...o,
});

export const dsPair = (o: Record<string, unknown> = {}) => ({
  chainId: "ethereum", dexId: "uniswap", url: "https://dexscreener.com/ethereum/0xp",
  pairAddress: "0xp", baseToken: { address: `0x${"1".repeat(40)}`, name: "Meme", symbol: "MEME" },
  quoteToken: { address: "0xw", name: "Wrapped Ether", symbol: "WETH" },
  priceUsd: "0.00001230", txns: { h24: { buys: 120, sells: 110 } }, volume: { h24: "250000" },
  priceChange: { h24: "-3.1" }, liquidity: { usd: "400000" }, fdv: "5100000000",
  marketCap: "5100000000", pairCreatedAt: Date.parse("2024-01-01T00:00:00Z"),
  info: { websites: [{ url: "https://meme.example" }], socials: [{ type: "twitter",
    url: "https://x.com/meme" }] },
  ...o,
});
