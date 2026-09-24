// executas/tokenbrief/test/protocol.test.ts — P-9.2: spawn the BUILT plugin and speak
// JSON-RPC over stdio. Requires `pnpm build` first (the test script builds before running).
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const PLUGIN = fileURLToPath(new URL("../dist/plugin.js", import.meta.url));

function session(lines: string[]): Promise<{ stdout: string[]; exitCode: number | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [PLUGIN], { stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (d) => { out += d; });
    child.on("error", reject);
    child.on("exit", (code) => resolve({ stdout: out.split("\n").filter(Boolean), exitCode: code }));
    for (const l of lines) child.stdin.write(l + "\n");
    child.stdin.end(); // EOF is the shutdown signal
  });
}

describe.runIf(existsSync(PLUGIN))("executa protocol over stdio", () => {
  it("answers describe/health/unknown/malformed and writes only JSON lines", async () => {
    const { stdout, exitCode } = await session([
      JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize",
        params: { protocolVersion: "2.0" } }),
      JSON.stringify({ jsonrpc: "2.0", id: 2, method: "describe" }),
      JSON.stringify({ jsonrpc: "2.0", id: 3, method: "health" }),
      JSON.stringify({ jsonrpc: "2.0", id: 4, method: "tools/list" }),
      "{not json",
      JSON.stringify({ jsonrpc: "2.0", id: 5, method: "invoke",
        params: { tool: "nope", arguments: {} } }),
      JSON.stringify({ jsonrpc: "2.0", id: 6, method: "invoke",
        params: { tool: "resolve_token", arguments: {} } }),
      JSON.stringify({ jsonrpc: "2.0", id: 7, method: "invoke",
        params: { tool: "resolve_token", arguments: { query: "hello world" } } }),
      JSON.stringify({ jsonrpc: "2.0", method: "notify_only" }),
      JSON.stringify({ jsonrpc: "2.0", id: 8, method: "shutdown" }),
    ]);
    expect(exitCode).toBe(0);
    const msgs = stdout.map((l) => JSON.parse(l)); // throws if any line is not JSON
    for (const m of msgs) expect(m.jsonrpc).toBe("2.0");
    const byId = new Map(msgs.map((m) => [m.id, m]));
    expect(byId.get(1).result.protocolVersion).toBe("2.0");
    const d = byId.get(2).result;
    expect(d.name).toBe("tokenbrief"); // bare manifest, not {manifest: …}
    expect(d.tools.map((t: { name: string }) => t.name))
      .toEqual(["resolve_token", "fetch_metrics", "fetch_pairs", "risk_flags"]);
    for (const t of d.tools) {
      expect(t.input_schema).toBeUndefined();
      for (const p of t.parameters) expect(p).toHaveProperty("description");
    }
    expect(byId.get(3).result).toMatchObject({ status: "healthy", tools_count: 4 });
    expect(byId.get(4).error.code).toBe(-32601);
    expect(byId.get(null).error.code).toBe(-32700);
    expect(byId.get(5).error.code).toBe(-32601);
    expect(byId.get(6).error.code).toBe(-32602);
    expect(byId.get(7).result).toMatchObject({ success: true, tool: "resolve_token",
      data: { status: "not_found", query: { kind: "invalid" } } });
    expect(byId.get(8).result).toBeNull();
    expect(msgs).toHaveLength(9); // the notification got no answer
  });
});
