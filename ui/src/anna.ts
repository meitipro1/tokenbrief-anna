// ui/src/anna.ts — the only file that touches the host. Loads the host-served SDK with a
// dynamic import Vite does not rewrite. Verified against @anna-ai/app-runtime 0.16.1: every
// call resolves to the bare result and rejects with an Error carrying `.code`
// (docs/anna-facts.md). The Executa's {success, data} envelope is stripped by the host in
// production; the wrapper also accepts it unstripped.

const SDK_URL = "/static/anna-apps/_sdk/latest/index.js"; // host-served (app-ui-sdk.md)
const HANDLE = "tokenbrief"; // app.json#bundled_executas handle

declare global {
  interface Window { __ANNA_TOOL_IDS__?: Record<string, string> }
}

/** Minted id from bundle/anna-tool-ids.js (written by `anna-app dev` / `apps publish`). */
export function toolId(): string {
  return (typeof window !== "undefined" && window.__ANNA_TOOL_IDS__?.[HANDLE]) ||
    import.meta.env.VITE_TOKENBRIEF_TOOL_ID || "tool-dev-tokenbrief";
}

export class HostError extends Error {
  constructor(readonly code: string, message: string) { super(message || code); }
}
export class ToolError extends Error {} // Executa returned success:false; message = code

export interface Msg { role: "user" | "assistant"; content: string }
export interface LlmArgs { messages: Msg[]; systemPrompt: string; maxTokens: number;
  temperature: number }

export interface AnnaClient {
  invokeTool<T>(method: string, args: object, timeoutMs?: number): Promise<T>;
  llmComplete(a: LlmArgs): Promise<{ text: string; model: string | null }>;
  storageGet<T>(key: string): Promise<T | null>;
  storageSet(key: string, value: unknown): Promise<void>;
  setTitle(title: string): Promise<void>;
  onEvent(kind: string, fn: (payload: unknown) => void): () => void;
  entryPayload: unknown;
  mock: boolean;
}

/** Normalise any SDK rejection into a HostError with a stable code. */
function hostError(e: unknown): HostError {
  if (e instanceof HostError) return e;
  const x = e as { code?: unknown; message?: string; name?: string } | null;
  const code = typeof x?.code === "string" ? x.code
    : /timed out/i.test(x?.message ?? "") ? "tool_timeout" : "unknown";
  return new HostError(code, x?.message ?? String(e));
}

async function call<T>(p: Promise<unknown>): Promise<T> {
  try {
    return (await p) as T;
  } catch (e) {
    throw hostError(e);
  }
}

/** Accept the plugin payload, or an unstripped {success, data | error} envelope. */
export function unwrapTool<T>(res: unknown): T {
  if (res && typeof res === "object" && "success" in res && typeof res.success === "boolean") {
    const r = res as { success: boolean; data?: unknown; error?: unknown };
    if (!r.success) throw new ToolError(String(r.error ?? "tool_failed"));
    return r.data as T;
  }
  return res as T;
}

interface Sdk {
  AnnaAppRuntime: { connect(): Promise<Runtime> };
}
interface Runtime {
  tools: { invoke(a: object, o?: object): Promise<unknown> };
  llm: { complete(a: object, o?: object): Promise<unknown> };
  storage: { get(a: object): Promise<unknown>; set(a: object): Promise<unknown> };
  window: { set_title(a: object): Promise<unknown> };
  on(kind: string, fn: (p: unknown) => void): () => void;
  entryPayload: unknown;
}

export async function connectAnna(): Promise<AnnaClient> {
  let mod: Sdk;
  try {
    if (!new URLSearchParams(location.search).get("wid")) throw new Error("no host window");
    mod = (await import(/* @vite-ignore */ SDK_URL)) as Sdk;
  } catch (err) {
    if (import.meta.env.DEV) return (await import("./mock")).mockAnna(); // pnpm --filter ui dev
    throw err;
  }
  const anna = await mod.AnnaAppRuntime.connect(); // hello + 10 s heartbeat
  return {
    mock: false,
    async invokeTool<T>(method: string, args: object, timeoutMs = 30_000): Promise<T> {
      const res = await call<unknown>(anna.tools.invoke(
        { tool_id: toolId(), method, args, timeoutMs }, { timeoutMs: timeoutMs + 5_000 }));
      return unwrapTool<T>(res);
    },
    async llmComplete(a) {
      const out = await call<{ content?: { text?: string } | { text?: string }[];
        model?: string }>(anna.llm.complete(a, { timeoutMs: 90_000 }));
      const c = out?.content;
      const text = Array.isArray(c) ? c.map((x) => x.text ?? "").join("") : c?.text ?? "";
      return { text, model: out?.model ?? null };
    },
    async storageGet<T>(key: string): Promise<T | null> {
      try {
        const r = await call<{ value?: T; exists?: boolean } | null>(anna.storage.get({ key }));
        return r && r.exists !== false ? r.value ?? null : null;
      } catch {
        return null; // storage is a convenience; never block a run on it
      }
    },
    async storageSet(key, value) { await call(anna.storage.set({ key, value })); },
    async setTitle(title) { await call(anna.window.set_title({ title })); },
    onEvent: (kind, fn) => anna.on(kind, fn),
    entryPayload: anna.entryPayload,
  };
}
