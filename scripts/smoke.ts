// scripts/smoke.ts — spawns the built plugin exactly the way Anna does (stdin/stdout pipes,
// stderr passed through), checks describe/health/-32601, then runs the §4.3 tool chain.
//   pnpm smoke -- PEPE [--record fixtures/tools/pepe.jsonl] [--quiet]
//   pnpm smoke -- PEPE --exe <extracted release binary>   (the packaged Executa instead)
// Exits non-zero if any stdout line is not JSON, a frame lacks jsonrpc "2.0", or a tool
// returns success:false. A not_found status is a successful result (exit 0).
import { spawn } from "node:child_process";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { createInterface } from "node:readline";

type Json = any; // eslint-disable-line @typescript-eslint/no-explicit-any

const PLUGIN = "executas/tokenbrief/dist/plugin.js";
const argv = process.argv.slice(2).filter((a) => a !== "--");
const take = (flag: string): string | undefined => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv.splice(i, 2)[1] : undefined;
};
const record = take("--record");
const exe = take("--exe");
const quietAt = argv.indexOf("--quiet");
const quiet = quietAt >= 0 && Boolean(argv.splice(quietAt, 1));
const query = argv.join(" ") || "PEPE";

if (record) {
  mkdirSync(dirname(record), { recursive: true });
  writeFileSync(record, "");
}

const child = spawn(exe ?? process.execPath, exe ? [] : [PLUGIN],
  { stdio: ["pipe", "pipe", "inherit"] });
const pending = new Map<number, (m: Json) => void>();
let nextId = 1;
let failed = false;

createInterface({ input: child.stdout }).on("line", (line) => {
  let msg: Json;
  try {
    msg = JSON.parse(line);
  } catch {
    console.error(`NON-JSON ON STDOUT: ${line.slice(0, 200)}`);
    failed = true;
    return;
  }
  if (msg.jsonrpc !== "2.0") { console.error("frame without jsonrpc 2.0"); failed = true; }
  pending.get(msg.id)?.(msg);
  pending.delete(msg.id);
});

function rpc(method: string, params?: unknown): Promise<Json> {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${method} timed out`)), 60_000);
    pending.set(id, (m) => { clearTimeout(timer); resolve(m); });
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });
}

const show = (label: string, value: unknown) => {
  if (!quiet) console.log(`\n=== ${label}\n${JSON.stringify(value, null, 2)}`);
  else console.log(`=== ${label}`);
};

async function invoke(tool: string, args: Record<string, unknown>): Promise<Json> {
  const started = Date.now();
  const res = await rpc("invoke", { tool, arguments: args });
  show(`${tool} (${Date.now() - started} ms)`, res.error ?? res.result);
  if (record) {
    appendFileSync(record, JSON.stringify({ tool, arguments: args,
      result: res.result ?? res.error }) + "\n");
  }
  if (res.error || res.result?.success !== true) {
    failed = true;
    throw new Error(`${tool} failed: ${res.result?.error ?? res.error?.message}`);
  }
  return res.result.data;
}

async function main() {
  const d = await rpc("describe");
  show("describe", { name: d.result?.name, version: d.result?.version,
    tools: d.result?.tools?.map((t: Json) => t.name) });
  show("health", (await rpc("health")).result);
  const unknown = await rpc("no_such_method");
  if (unknown.error?.code !== -32601) { failed = true; console.error("expected -32601"); }
  let r = await invoke("resolve_token", { query });
  if (r.status === "ambiguous") {
    const c = r.candidates[0];
    console.log(`\nambiguous → picking ${c.name} (${c.cgId})`);
    r = await invoke("resolve_token", { query: `https://www.coingecko.com/en/coins/${c.cgId}` });
  }
  if (r.status !== "resolved") return console.log(`\nstatus ${r.status}; chain stops here`);
  const t = r.token;
  const [metrics, pairs] = await Promise.all([
    invoke("fetch_metrics",
      { cgId: t.cgId, chain: t.primaryChain, address: t.primaryAddress, symbol: t.symbol }),
    t.primaryAddress
      ? invoke("fetch_pairs", { chain: t.primaryChain, address: t.primaryAddress })
      : Promise.resolve(null),
  ]);
  const flags = await invoke("risk_flags", pairs ? { metrics, pairs } : { metrics });
  console.log(`\nSUMMARY ${t.symbol} (${t.cgId ?? t.primaryAddress}) price=` +
    `${metrics.priceUsd.value} [${metrics.priceUsd.source}] liq=${metrics.liquidityUsd.value} ` +
    `flags=${flags.flags.map((f: Json) => `${f.code}:${f.severity}`).join(",") || "none"}`);
}

main()
  .catch((e) => { console.error(e.message); failed = true; })
  .finally(() => {
    child.stdin.end(); // EOF = shutdown signal
    const done = () => process.exit(failed ? 1 : 0);
    if (child.exitCode !== null) done();
    else { child.once("exit", done); setTimeout(done, 5000); }
  });
