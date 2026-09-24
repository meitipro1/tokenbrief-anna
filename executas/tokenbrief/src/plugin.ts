// executas/tokenbrief/src/plugin.ts — JSON-RPC 2.0 over stdio (reference/executa-protocol.md):
// one message per LF line, only protocol frames on stdout, logs on stderr, `describe` returns
// the bare manifest, `invoke` always sets `success`, unknown methods get -32601, and the loop
// reads stdin until EOF.
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { InvalidParams, toolErrorCode } from "./errors.js";
import { audit, log } from "./log.js";
import { MANIFEST, VERSION } from "./manifest.js";
import { TOOLS } from "./tools/index.js";

type Id = string | number | null;
type Req = { jsonrpc?: string; id?: Id; method?: unknown; params?: Record<string, unknown> };

const SOFT_CAP = 512 * 1024; // MAX_STDIO_MESSAGE_BYTES → file transport above this
const HARD_CAP = 2 * 1024 * 1024; // MAX_READLINE_BYTES

function send(msg: { id: Id } & Record<string, unknown>): void {
  let line = JSON.stringify(msg);
  if (Buffer.byteLength(line) > SOFT_CAP) {
    const file = join(tmpdir(), `executa-resp-${randomUUID()}.json`);
    writeFileSync(file, line);
    line = JSON.stringify({ jsonrpc: "2.0", id: msg.id, __file_transport: file });
  }
  process.stdout.write(line + "\n");
}

const reply = (id: Id, result: unknown) => send({ jsonrpc: "2.0", id, result });
const fail = (id: Id, code: number, message: string) =>
  send({ jsonrpc: "2.0", id, error: { code, message } });

async function invoke(id: Id, params: Record<string, unknown> | undefined): Promise<void> {
  const tool = params?.tool;
  const fn = typeof tool === "string" ? TOOLS[tool] : undefined;
  if (!fn) return fail(id, -32601, `unknown tool: ${String(tool)}`);
  const args = params?.arguments ?? {};
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    return fail(id, -32602, "arguments must be an object");
  }
  const started = Date.now();
  let ok = false;
  try {
    const data = await fn(args as Record<string, unknown>);
    ok = true;
    reply(id, { success: true, tool, data });
  } catch (e) {
    if (e instanceof InvalidParams) return fail(id, -32602, e.message);
    log(`${tool} failed`, e);
    reply(id, { success: false, tool, error: toolErrorCode(e) });
  } finally {
    audit(String(tool), Date.now() - started, ok);
  }
}

async function handle(line: string): Promise<void> {
  if (!line.trim()) return;
  if (line.length > HARD_CAP) return fail(null, -32600, "request line exceeds 2 MiB");
  let req: Req;
  try {
    req = JSON.parse(line) as Req;
  } catch {
    return fail(null, -32700, "parse error");
  }
  if (!req || typeof req !== "object" || req.jsonrpc !== "2.0" || typeof req.method !== "string") {
    return fail(req?.id ?? null, -32600, "invalid request");
  }
  if (req.id === undefined) return; // notification: never answered
  const id = req.id;
  switch (req.method) {
    case "initialize": // v2 handshake; TokenBrief uses no reverse RPC
      return reply(id, {
        protocolVersion: req.params?.protocolVersion ?? "2.0",
        client_capabilities: {},
        server_info: { name: MANIFEST.display_name, version: VERSION },
      });
    case "describe":
      return reply(id, MANIFEST); // bare manifest, never wrapped
    case "health":
      return reply(id, {
        status: "healthy", timestamp: new Date().toISOString(),
        version: VERSION, tools_count: MANIFEST.tools.length,
      });
    case "invoke":
      return invoke(id, req.params);
    case "shutdown":
      return reply(id, null); // stdin EOF is the real signal; keep reading
    default:
      return fail(id, -32601, `method not found: ${req.method}`);
  }
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity, terminal: false });
rl.on("line", (line) => {
  handle(line).catch((e) => log("handler crashed", e));
});
rl.on("close", () => log("stdin EOF; exiting when in-flight work drains"));
process.on("uncaughtException", (e) => log("uncaughtException", e));
process.on("unhandledRejection", (e) => log("unhandledRejection", e));
