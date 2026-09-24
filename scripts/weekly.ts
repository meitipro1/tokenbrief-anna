// scripts/weekly.ts — P-9.23: pick candidates for "Token brief of the week". CoinGecko
// /search/trending (keyless) → run the four tools through the built Executa over JSON-RPC →
// content/weekly/<date>.md with a table and each candidate's FACTS. No prose is generated
// here: the post text comes from running TokenBrief itself in Anna (real output).
//   pnpm tsx scripts/weekly.ts [--max 5]
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

type Json = any; // eslint-disable-line @typescript-eslint/no-explicit-any
const i = process.argv.indexOf("--max");
const MAX = i >= 0 ? Number(process.argv[i + 1]) : 5;

const child = spawn(process.execPath, ["executas/tokenbrief/dist/plugin.js"],
  { stdio: ["pipe", "pipe", "ignore"] });
const pending = new Map<number, (m: Json) => void>();
let id = 0;
createInterface({ input: child.stdout }).on("line", (l) => {
  const m = JSON.parse(l);
  pending.get(m.id)?.(m);
});
const tool = (name: string, args: object): Promise<Json> => new Promise((res, rej) => {
  const n = ++id;
  pending.set(n, (m) => (m.result?.success ? res(m.result.data)
    : rej(new Error(m.result?.error ?? m.error?.message))));
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: n, method: "invoke",
    params: { tool: name, arguments: args } }) + "\n");
});

const r = await fetch("https://api.coingecko.com/api/v3/search/trending",
  { headers: { accept: "application/json" } });
const trending: { item: { id: string; symbol: string; name: string } }[] =
  r.ok ? (await r.json()).coins ?? [] : [];
if (!trending.length) console.error(`trending unavailable (HTTP ${r.status})`);

const rows: string[] = [];
const blocks: string[] = [];
for (const { item } of trending.slice(0, MAX)) {
  try {
    const res = await tool("resolve_token", { query: `https://www.coingecko.com/en/coins/${item.id}` });
    if (res.status !== "resolved") continue;
    const t = res.token;
    const [metrics, pairs] = await Promise.all([
      tool("fetch_metrics", { cgId: t.cgId, chain: t.primaryChain, address: t.primaryAddress,
        symbol: t.symbol }),
      t.primaryAddress ? tool("fetch_pairs", { chain: t.primaryChain, address: t.primaryAddress })
        .catch(() => null) : Promise.resolve(null),
    ]);
    const { flags } = await tool("risk_flags", pairs ? { metrics, pairs } : { metrics });
    const high = flags.filter((f: Json) => f.severity === "high").length;
    const ch = metrics.change24hPct.value;
    const rank = metrics.rank.value;
    const score = (high >= 1 && high <= 2 ? 2 : 0) + (rank && rank <= 200 && Math.abs(ch ?? 0) > 10 ? 2 : 0)
      + (rank && rank <= 20 ? 1 : 0);
    rows.push(`| $${t.symbol} | ${t.cgId} | ${rank ?? "n/a"} | ${ch ?? "n/a"} | ` +
      `${metrics.liquidityUsd.value ?? "n/a"} | ${flags.map((f: Json) => f.code).join(", ") || "—"} | ${score} |`);
    blocks.push(`### $${t.symbol} (${t.name})\n\n\`\`\`json\n${JSON.stringify({
      price: metrics.priceUsd, change24hPct: metrics.change24hPct, marketCapUsd: metrics.marketCapUsd,
      fdvUsd: metrics.fdvUsd, liquidityUsd: metrics.liquidityUsd, rank: metrics.rank,
      flags: flags.map((f: Json) => `${f.code}:${f.severity}`) }, null, 2)}\n\`\`\``);
    console.error(`ok ${t.symbol}`);
  } catch (e) {
    console.error(`skip ${item.symbol}: ${(e as Error).message}`);
  }
}
child.stdin.end();

const date = new Date().toISOString().slice(0, 10);
mkdirSync("content/weekly", { recursive: true });
const out = `content/weekly/${date}.md`;
writeFileSync(out, `# Brief-of-the-week candidates — ${date} (UTC)

Source: CoinGecko trending, run through the TokenBrief tools. Prefer 1–2 high flags or a top-200
mover. Never pick a token you hold. Numbers below are raw tool output at generation time; the
post uses the app's own share card from a fresh run (content/launch/weekly-template.md).

| Symbol | cgId | Rank | 24h % | DEX liquidity (USD) | Flags | Post-worthy |
|---|---|---|---|---|---|---|
${rows.join("\n")}

${blocks.join("\n\n")}
`);
console.log(out);
