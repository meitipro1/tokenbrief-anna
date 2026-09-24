Chapter 5 — Platform & API Reference
Everything below marked "verified" was read from the official page on 24 Sep 2026.
Anything else is tagged [VERIFY]; resolve those on Day 1 against anna-app --help, the
scaffolded project, and the harness, and record the answers in docs/api-notes.md.
5.1 Sources verified in this session
Page Facts taken
https://anna.partners/llms.txt Doc index; definitions of Executa and Anna App
https://anna.partners/developers/apps/app-quick‐
start.md
Prerequisites, init, dev, validate, 
mountBundle
https://anna.partners/developers/apps/app-mani‐
fest.md
Manifest keys, schema 1/2/3 rules, dev block, ex‐
amples
https://anna.partners/developers/reference/app-
manifest.md
Field types and limits
https://anna.partners/developers/apps/app-ui-mani‐
fest.md
Full ui example, grant syntax, form_factors,
CSP
https://anna.partners/developers/reference/ui-
manifest.md
bundle, views, csp_overrides, state_merge, 
host_api
https://anna.partners/developers/reference/ui-host-
api.md
Namespaces and method names
https://anna.partners/developers/reference/host-
api-llm.md
llm.complete / llm.stream signatures, limits
https://anna.partners/developers/reference/host-
api-tools.md
tools.* signatures, timeouts, ACL, error codes
https://anna.partners/developers/apps/app-ui-
sdk.md
SDK path, AnnaAppRuntime.connect() , events,
storage, window
https://anna.partners/developers/reference/ex‐
ecuta-protocol.md
Wire protocol, methods, shapes, error codes, rules
https://anna.partners/developers/tools/executa-
nodejs.md
Node quickstart methods, stdout rule, distribution
https://anna.partners/developers/apps/local-dev.md --executa syntax, executa.json requirements,
harness URL
https://anna.partners/developers/apps/local-dev-
llm.md
PAT, login, dev --llm real/mock , credential
storage
https://anna.partners/developers/reference/cli.md Every command and flag in §5.8
https://anna.partners/developers/apps/app-pub‐
lish.md
Lifecycle states, pre-flight checks, "no enforced
SLA"
https://anna.partners/developers/reference/veri‐
fied-developer.md
Activation steps, limits

Page Facts taken
https://anna.partners/developers/reference/sse-
events.md
Event kinds
https://docs.coingecko.com/reference/common-er‐
rors-rate-limit
Public rate limit, 429/10005
https://docs.dexscreener.com/api/reference Endpoint list, per-endpoint limits, pair schema
Not reachable: https://dorahacks.io/hackathon/2349/buidl (HTTP 405). Not fetched
(budget): reference/packages.md , reference/executa-distribution.md , tools/executa-
publish.md, apps/app-listing.md, apps/app-mobile.md — all tagged where they matter.
5.2 Anna App manifest ( manifest.json)
Verified top-level keys (reference/app-manifest.md, apps/app-manifest.md):
Key Type Required Verified rule
schema int yes 1 = chat-augmentation, no UI; 2 = UI
runtime enabled; 3 = UI + structured 
storage, permissions rejected
required_executas {tool_id, ver‐
sion?, min_ver‐
sion?}[]
yes (≥1) auto-installed on app install
optional_executas same no injected into prompts, not auto-in‐
stalled
host_capabilities string[] no strict allow-list; values seen: aps.kv, 
aps.files, llm.sample, web.*
permissions string[] no display-only on schema ≤2; rejected
at schema 3
storage object no schema 3 only, replaces aps.*
strings [VERIFY shape]
sys‐
tem_prompt_addendum
string no max 4000 chars; injected when the
App is active
user_mes‐
sage_prefix_template
string no max 500 chars; exactly one 
{user_message}
tags string[] no stored, "not currently surfaced"
ui object no (required in
practice for
schema ≥2)
§5.3
dev object no harness only; anna-app publish strips
it; keys fixtures, mocks, seed_stor‐
age, user_id

Not present in the fetched reference: name, slug, version, description, icon. anna-app
apps sync-meta "pushes metadata (name, tagline) from manifest", so listing metadata has
a home — [VERIFY where the scaffold puts name/tagline/version; the .anna/app.json
identity cache and the Console listing fields are the other candidates].
T okenBrief manifest (use the schema value the scaffold emits; the docs' current UI example
uses 3):
{
"schema": 3,
"required_executas": [{ "tool_id": "tool-dev-tokenbrief" }],
"host_capabilities": ["llm.sample", "aps.kv"],
"tags": ["crypto", "tokens", "research", "defi", "persian"],
"system_prompt_addendum": "You have TokenBrief tools. When the user asks about a coin or 
token, call resolve_token first; if several candidates share a symbol, ask the user to 
choose. Then call fetch_metrics, fetch_pairs and risk_flags and answer with the numbers and 
flags exactly as returned. Never state a number, ranking or date you did not receive from a 
tool. Never give buy/sell advice. Offer open_app_view('main') for the full brief with share 
text and Persian.",
"user_message_prefix_template": "[TokenBrief] {user_message}",
"ui": {
"bundle": { "format": "static-spa", "entry": "index.html",
"external_origins": ["https://coin-images.coingecko.com",
"https://dd.dexscreener.com"] },
"views": [{
"name": "main", "title": "TokenBrief", "default": true,
"default_size": { "w": 900, "h": 680 }, "min_size": { "w": 360, "h": 480 },
"single_instance": true,
"summary_template": "TokenBrief for {symbol}: {headline}"
}],
"host_api": {
"tools": ["required:*"],
"llm": ["complete"],
"storage": ["get", "set", "delete", "list"],
"chat": ["append_artifact"],
"window": ["set_title", "close"]
},
"form_factors": ["desktop", "mobile"]
},
"dev": { "user_id": 1 }
}
Verify: (1) whether aps.kv must move into the schema-3 storage block — do what 
anna-app validate says; (2) whether host_capabilities: ["llm.sample"]  is needed for
UI-side llm.complete or only for Executa-side sampling (harmless to keep); (3) the 
external_origins values only matter for logos — drop them if review objects.
5.3 UI manifest section ( ui)
Verified (reference/ui-manifest.md, apps/app-ui-manifest.md):
Key Verified detail
bundle.entry required; bundle-relative path to the SPA entry HTML
bundle.format optional; default static-spa

Key Verified detail
bundle.external_origins optional string[]; appended automatically to connect-
src and img-src
views[].name required; 1–40 chars, unique per App; used by win‐
dow.open_view
views[].title required; window title
views[].entry optional sub-route (e.g. index.html#/chart); defaults
to bundle entry
views[].icon, default, default_size/ min_s‐
ize/ max_size ( {w,h}, 120–4096 px), resiz‐
able, movable, single_instance
optional
views[].summary_template optional, max 400 chars; summarises view state for
the LLM
views[].mobile_entry optional per-view mobile entry point
form_factors optional, inside ui; values "desktop" (default) and 
"mobile"; declare "mobile" to appear in the mobile
launcher
host_api per-namespace whitelist (grant syntax below)
csp_overrides per-directive additions; allowed directives connect-
src, img-src, media-src, font-src, style-src
( 'self', 'sha256-…', 'nonce-…' only), script-src
(same plus 'wasm-unsafe-eval' )
state_merge conflict policy for concurrent writes; default 
last_writer_wins
Grant syntax (verified): tools: "required:*", "optional:*", "required:<tool_id>", 
"optional:<tool_id>" or a bare "<tool_id>"; llm: "complete", "stream", "embed"; storage:
get/ set/ delete/ list; chat: append_artifact/ write_message/ read_history; window: always
granted; agent: object form { "session": { "auto": true, "fixed": false }, "tools":
[...] }; also files, credentials, image, upload, web ( search, fetch, image_search, 
image_fetch), apps, mobile.
CSP baseline (verified): default-src 'none', connect-src 'self', 
img-src 'self' data: blob:  — external fetch() from the iframe is blocked unless the
origin is whitelisted. T okenBrief does not need it (the Executa fetches), which keeps the
review surface small.
5.4 Executa protocol (JSON-RPC 2.0 over stdio)
Verified (reference/executa-protocol.md): one JSON-RPC message per line, LF-delimited
UTF-8, no Content-Length headers; all protocol traffic on stdout, logs on stderr; 512 KiB
soft cap and 2 MiB hard cap per line.

Method (agent →
plugin)
Purpose Timeout
initialize v2 handshake: echo protocolVersion, advertise cli‐
ent_capabilities
5 s
describe return the bare manifest (cached once per spawn) 5–60 s
invoke run a tool with validated arguments — required 60 s default, per-tool
override
health optional; {status, timestamp, version,
tools_count}
3 s
shutdown reserved; stdin EOF is the real signal; 5 s grace —
Reverse methods (plugin → agent, v2 only, not used by T okenBrief's MVP): sampling/
createMessage; agent/session.create|run|cancel|history|delete , agent/complete; storage/
get|set|delete|list; files/upload_begin|upload_complete|download_url|list|delete .
Invoke request and response (verified shapes):
{"jsonrpc":"2.0","id":7,"method":"invoke",
"params":{"tool":"resolve_token","arguments":{"query":"PEPE"},
"context":{"credentials":{}},"invoke_id":"<uuid>","sampling_token":"<jwt>"}}
{"jsonrpc":"2.0","id":7,
"result":{"success":true,"tool":"resolve_token","data":{"candidates":[]}}}
T ool-level failure: "result": {"success": false, "error": "user-facing text"}  — the LLM
sees it. Protocol errors use standard codes -32600 invalid request, -32601 method not
found (return it for unknown methods; it drives v1/v2 negotiation), -32602 invalid params, 
-32603 internal; sampling -32001 SAMPLING_NOT_GRANTED, -32008 SAMPLING_NOT_NEGOTIATED ;
storage -32021 STORAGE_NOT_GRANTED, -32022 NOT_FOUND; agent -32041, -32042.
Describe result — the Executa manifest (verified required fields): name (kebab/snake-case,
unique), display_name, version (semver), tools[] of {name, description, parameters[],
timeout?, streaming?} , credentials[], host_capabilities[] (e.g. "llm.sample", 
"llm.agent.auto", "storage"); optional description, runtime ( {type: "binary"|"uv"|"npm",
min_version?}), author. Each parameter: name, type ( string|integer|number|boolean|array|
object), description, required (default true), default, enum; arrays need items: {type} or
items_type — not MCP's input_schema.
{
"name": "tokenbrief", "display_name": "TokenBrief Data Tools", "version": "0.1.0",
"description": "Live token identity, numbers, pairs and rule-based risk flags.",
"runtime": { "type": "npm", "min_version": "20.0.0" },
"credentials": [], "host_capabilities": [],
"tools": [
{ "name": "resolve_token", "timeout": 25,
"description": "Map a ticker, contract address or CoinGecko/CMC/DexScreener URL to a 
token.",
"parameters": [
{ "name": "query", "type": "string", "description": "ticker, address or URL" },
{ "name": "prefer_chain", "type": "string", "required": false,
"description": "DexScreener chainId hint, e.g. base, solana" } ] },
{ "name": "fetch_metrics", "timeout": 25,

"description": "Live numbers and identity for a resolved token.",
"parameters": [
{ "name": "coingecko_id", "type": "string", "required": false },
{ "name": "chain", "type": "string", "required": false },
{ "name": "address", "type": "string", "required": false } ] },
{ "name": "fetch_pairs", "timeout": 25,
"description": "DEX pairs, liquidity, volume and transaction counts.",
"parameters": [
{ "name": "chain", "type": "string", "required": false },
{ "name": "address", "type": "string" } ] },
{ "name": "risk_flags", "timeout": 10,
"description": "Evaluate rule-based risk flags over metrics and pairs.",
"parameters": [
{ "name": "metrics", "type": "object" },
{ "name": "pairs", "type": "object", "required": false } ] }
]
}
[VERIFY the unit of timeout (seconds assumed) and whether description is required per
parameter.]
Rules the protocol page calls critical: stdout is protocol-only; flush after every write; read
stdin until EOF and never exit() after one response; describe returns the bare manifest; 
invoke results must set "success": true explicitly; return -32601 for unknown methods;
credentials only via credentials[]/ context.credentials.
5.5 Node.js Executa quickstart, distilled
Verified (tools/executa-nodejs.md, apps/local-dev.md, reference/cli.md):
anna-app executa init executa --template node --slug tokenbrief --tool-id tool-dev-
tokenbrief scaffolds a plugin directory with executa.json (the CLI default tool_id is 
tool-dev-<slug>).
The plugin is a CLI that reads JSON lines from stdin and answers describe, health and 
invoke on stdout (Node 18+ per the quickstart; use Node 22 anyway).
"Anything you console.log mixes into protocol output and breaks the plugin. Use 
console.error."
Smoke test: echo '{"jsonrpc":"2.0","method":"describe","id":1}' | node dist/plugin.js .
executa.json must contain both tool_id and type ( python|node|go|binary ); otherwise
the harness silently skips it and tools.invoke fails with not_implemented: tools.invoke is
not available in this runtime . Other keys ( command, slug, name, version) [VERIFY
against the scaffold].
Wire it into the harness: anna-app dev --executa dir=executa,type=node,tool_id=tool-dev-
tokenbrief,command="node dist/plugin.js" .
Isolated checks: anna-app executa dev --dir executa --describe , --health, --invoke
resolve_token --args '{"query":"PEPE"}' --json .
Distribution (verified as the two documented paths): publish to npm with a bin field, or
a .tar.gz archive with distribution_type: local  for local development; Node 20+
single-executable builds via @yao-pkg/pkg are optional. Production hosting of a Node
Executa from npm is the assumption behind runtime.type: "npm" [VERIFY on tools/
1. 
2. 
3. 
4. 
5. 
6. 
7. 
8. 

executa-publish.md and reference/executa-distribution.md; Discord question 6 in
Chapter 2 §2.11].
5.6 UI SDK and host API
Verified (apps/app-ui-sdk.md, reference/host-api-*.md):
import { AnnaAppRuntime } from "/static/anna-apps/_sdk/latest/index.js";
const anna = await AnnaAppRuntime.connect(); // reads wid + t from the iframe URL,
// sends window.hello, starts a 10 s heartbeat
The SDK is served by the host, not npm. For Vite, keep the import string absolute and
mark it external:
// ui/vite.config.ts
export default defineConfig({
  base: "./",
  build: { outDir: "../bundle", emptyOutDir: true,
           rollupOptions: { external: ["/static/anna-apps/_sdk/latest/index.js"] } }
});
[VERIFY that the harness serves the same SDK path on 127.0.0.1:5180; reference/
packages.md may list an npm types package.]
T ool calls (verified signatures, reference/host-api-tools.md):
anna.tools.list(args?: {}, opts?: {timeoutMs?}) 
=> Promise<{tools: {tool_id: string, status?: "available"|"deploying"|"unavailable"}[]}>
anna.tools.invoke(args: {tool_id: string, method?: string, args?: object, timeoutMs?:
number},
                  opts?: {timeoutMs?: number}) => Promise<object>
anna.tools.invokeAsync(args: {tool_id, method?, args?, timeoutMs?, clientTag?})
=> Promise<{jobId: string, state: "queued", deadlineMs: number}>
anna.tools.getJob({jobId, sinceSeq?, limit?}) / cancelJob({jobId, reason?}) / listJobs({...})
method is the tool name inside the Executa (the docs' example: method: "page.fetch").
Sync timeout is clamped to [1,000, 90,000] ms; async jobs 60 s–24 h, args ≤64 KB. T wo-
layer ACL: the tool_id must be in required_executas/ optional_executas and matched by 
ui.host_api.tools; otherwise permission_denied. Stable error codes: tool_timeout, 
tool_failed, executa_unavailable, agent_unavailable, permission_denied, invalid_arg.
const res = await anna.tools.invoke({
tool_id: TOOL_ID, method: "resolve_token", args: { query }, timeoutMs: 20000 });
Verify: the SDK page says every call returns { ok: true, result } or { ok: false,
error: { code, message } }  and shows const { result } = await
anna.tools.invoke(...) , while the reference pages type the promise as the bare result.
Log the first call in the harness and adapt the wrapper in ui/src/anna.ts (accept both: 
res.result ?? res).
LLM (verified, reference/host-api-llm.md):

anna.llm.complete(args: {
  messages: {role: "user"|"assistant"|"system", content: string|object}[],
  maxTokens?: number, temperature?: number, systemPrompt?: string,
  stopSequences?: string[], metadata?: object,
  modelPreferences?: {hints?, costPriority?, speedPriority?, intelligencePriority?}
}, opts?: {timeoutMs?: number}) => Promise<{
  role: "assistant", content: {type: "text", text: string}, model: string,
  stopReason: string, usage: {inputTokens, outputTokens, totalTokens},
  _meta?: {provider: string|null, latencyMs: number, quotaConsumed: number, appSessionUuid: s
tring}
}>
Grant: ui.host_api.llm must contain "complete" (or "*"). Billing: the user's existing quota/
provider account. Output tokens are silently clamped to quota_caps.max_tokens_per_call
(default 4096); maxTokens ≤ 0 raises APP_INVALID_REQUEST. llm.stream has the same
request shape, yields {event:"model_token", text}  frames then a complete frame, default
timeout 180,000 ms, needs SDK ≥0.10.0 / dispatcher ≥0.12.0. llm.embed exists as a grant
name; its signature was not documented on the fetched page [VERIFY if ever needed].
const out = await anna.llm.complete({
systemPrompt: SYNTHESIS_SYSTEM,
messages: [{ role: "user", content: JSON.stringify({ identity, numbers, flags }) }],
maxTokens: 900, temperature: 0.2
}, { timeoutMs: 60000 });
const text = out.content.text; // or out.result.content.text — see the Verify above
Storage, window, chat, events (verified):
await anna.storage.set({ key: "recent", value: [...] }); // 256 KB KV store
const { value } = await anna.storage.get({ key: "recent" });
await anna.storage.delete({ key: "recent" });
await anna.window.set_title({ title: "TokenBrief — PEPE" });
await anna.window.resize({ w: 1024, h: 768 });
await anna.window.close({ reason: "user_done" });
const off = anna.on("entry_payload", (p) => {...}); // also runtime_state_synced,
// geometry_changed, title_changed, close
anna.entryPayload; // from open_app_view(payload=…)
anna.runtimeState; // persisted state
chat.append_artifact / write_message / read_history are granted names; their argument
shapes were not on the fetched pages [VERIFY on reference/host-api-chat.md before
implementing the "post to chat" stretch].
5.7 SSE events
Verified (reference/sse-events.md): the host streams event: data_model/AnnaAppEvent
frames to the bundle. Kinds: ping, open_view, close_view, window_focus_changed, 
geometry_changed, title_changed, status_changed, runtime_state_synced, artifact_appended,
chat_message_from_app , rpc.stream, anna_app_tools_changed , executa_reconcile_result , 
executa_readiness. Rule: "Treat unknown kinds as forward-compatible — drop, don't
throw." The SDK's anna.on(...) wraps the ones the UI needs; T okenBrief only reacts to 
entry_payload (pre-filled query from chat) and close. Watch executa_readiness in the
harness console when a tool call returns executa_unavailable.

5.8 anna-app CLI — the commands this project uses
Verified (reference/cli.md, apps/app-quickstart.md). Install: Node 22+, uv ( curl -LsSf
https://astral.sh/uv/install.sh | sh  — doctor checks it even for Node plugins), then npm
install -g @anna-ai/cli ; anna-app --help; anna-app doctor.
Command Flags used Purpose
anna-app init <dir> --slug, --template minimal , --force scaffold app ( manifest.json, 
bundle/, executas/)
anna-app executa init
<dir>
--template node, --slug, --tool-id, 
--force
scaffold the plugin
anna-app validate --bundle <dir>, --strict (adds
host_api ACL grep of bundle code)
schema + UI static + tool_id lint
anna-app dev --port 5180, --user-id 1, --bundle
<dir>, --view <path>, --no-watch, --
no-llm, `--llm <real
mock> [VERIFY value form], --
mock-llm , --llm-account , --
llm-app-slug , --storage legacy
anna-app executa dev --dir, --describe, --health, --invoke
<tool>, --args <json>, --json, --no-
sampling, `--storage off
memory
`anna-app fixture verify summarize replay `
anna-app login --host <url> (required), --no-browser device-code OAuth; saves the
PAT
anna-app whoami / 
logout / `token list
revoke scopes`
anna-app account set-
handle <handle>
--host developer namespace for pub‐
lishing (use meitipro1)
anna-app executa pub‐
lish
`--bump patch minor
anna-app apps push --bump, --bundle-dir, --executa-id
<handle=id> (repeatable), --skip-ex‐
ecuta-publish, --no-bundled-executas , 
--dry-run, --if-match <revision>
upsert the mutable working draft
(manifest + bundle)
anna-app apps cut
<version>
--changelog <text> , --dry-run snapshot draft → immutable ver‐
sion
anna-app apps submit-
review [slug]
--json DRAFT → PENDING_REVIEW
anna-app apps release
<version>
--allow-create publish an approved version live
anna-app apps pub‐
lish / anna-app pub‐
lish
--bump, --dry-run, --no-bundle one-shot mint (auto-detects 
manifest.json vs executa.json)
`anna-app apps status versions grants

Command Flags used Purpose
anna-app apps sync-
meta / rename-slug
<new> / unpublish / 
archive / delete
--yes, --confirm <slug> metadata and lifecycle
Environment variables: $ANNA_APP_HOST (default host), $ANNA_NEXUS_ROOT (contributor mode,
not needed). State files: .anna/app.json, .anna/executa.json (identity caches — commit
neither), ~/.config/anna/credentials.json  (cli.md) — the PAT page says ~/.local/share/
anna-app/credentials.json  (mode 600) [VERIFY which path your CLI version uses; anna-app
whoami tells you]. Exit codes: 0 ok, 1 runtime error (invoke error, missing PAT scope), 2
launch/config error.
5.9 Publish pipeline, review, developer account
Verified (apps/app-publish.md, reference/verified-developer.md):
Activate Verified Developer in the Developer Console (/developer): verify email →
accept Developer T oS → optional handle → activate. "Self-service and instant." Needed
for apps, not for Executas.
anna-app login --host <ANNA_HOST>  → anna-app account set-handle meitipro1 .
anna-app validate --strict  (clean).
anna-app executa publish  (mint the Executa; note the production tool_id), then update 
required_executas — or let anna-app apps push --executa-id meitipro1=<id>  map it
[VERIFY exact flow].
anna-app apps push → anna-app apps cut 0.1.0 --changelog "MVP"  → 
anna-app apps submit-review .
States: DRAFT → PENDING_REVIEW → APPROVED → PUBLISHED  (or ARCHIVED); REJECTED returns to
DRAFT, resubmission allowed without penalty. After approval: anna-app apps release
0.1.0.
Reviewer pre-flight (verified list): manifest validates against the schema and the live
Executa catalogue; listing copy and screenshots match observed behaviour; mobile
adaptation requirements met if "mobile" is declared. T urnaround: "no enforced SLA
today" (docs) vs 3–5 business days (program thread).
Limits: 10 app creations/day, 5 review submissions/day, 20 active apps.
Not on the fetched pages: listing field lengths, icon and screenshot sizes (apps/app-
listing.md [VERIFY]); how versions roll out to installed users (apps/app-versioning.md
[VERIFY]; the brief says versions are rolled out to installed users).
5.10 Personal Access Token for dev --llm
Verified (apps/local-dev-llm.md): create/manage PAT s in the web dashboard → Developer
T okens (/dashboard/dev/tokens ); anna-app login --host <ANNA_HOST>  runs the device flow
and stores a long-lived JWT (audience aps-dev-pat, type anna_app_dev_pat, scope aps:dev,
default TTL 90 days). The PAT "does not grant LLM access by itself" — the harness mints
1. 
2. 
3. 
4. 
5. 
6. 
7. 
8. 

short-lived app_session_tokens via POST /api/v1/anna-apps/dev/session/mint  for apps you
own and forwards iframe RPCs to production with Authorization: Bearer <token> . anna-app
dev --llm real counts against your real quota; --llm mock --mock-llm fixtures/
replies.jsonl is deterministic and offline; --no-llm returns llm_disabled. Revoke at POST /
api/v1/anna-apps/dev/tokens/{token_id}/revoke  (204); revoked PAT s get 401 token_revoked.
Never commit credentials.json.
5.11 CoinGecko public API (keyless)
Base URL https://api.coingecko.com/api/v3  (Pro keys use https://pro-api.coingecko.com/
api/v3 [VERIFY]). Verified limit: "For Public API user (Demo plan), the rate limit is ~30 calls
per minutes and it varies depending on the traffic size." HTTP 429 = limit reached; error
code 10005 = endpoint not available on your plan. A free Demo key ( x-cg-demo-api-key
header, 10,000 calls/month [VERIFY]) is an upgrade path only if a server-side secret
mechanism exists (Chapter 3 §3.15).
Endpoint Params Fields used Cache
GET /
search?
query=<q>
— coins[]{id,name,symbol,api_symbol,market_cap_rank,thumb,large} 6 h
GET /
coins/
{id}
localiza‐
tion=false&tickers=false&market_data=true&community_data=true&developer_data=false&sparkline=false
sym‐
bol,name,as‐
set_plat‐
form_id,plat‐
forms{},categories[],genesis_date,links{homepage[],twitter_screen_name,telegram_channel_identifier,chat_url[]},image{small},market_data{current_price.usd,market_cap.usd,fully_diluted_valuation.usd,total_volume.usd,price_change_percentage_24h,price_change_percentage_7d,ath.usd,ath_change_percentage.usd,ath_date.usd,circulating_supply,total_supply,max_supply,last_updated},community_data{twitter_followers,telegram_channel_user_count
}
60 s
GET /
coins/
{as‐
set_plat‐
form_id}/
contract/
{address}
— same shape as /coins/{id} 6 h (id
map‐
ping)
GET /
simple/
price
ids=<id>&vs_curren‐
cies=usd&in‐
clude_market_cap=true&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true
{<id>:{usd,usd_market_cap,usd_24h_vol,usd_24h_change,last_updated_at}} 30 s
(follow-
up re‐
fresh)
GET /
coins/
{id}/mar‐
ket_chart
vs_currency=usd&days=7 prices[][ts_ms,price] 10 min
(stretch
spark‐
line)
GET /as‐
set_plat‐
forms
— id values such as ethereum, binance-smart-chain , base, solana 24 h

All parameter and field names above are from working knowledge of the v3 API, not from a
fetched page: [VERIFY each against https://docs.coingecko.com/reference on Day 2 with
one live curl per endpoint, and save the responses as fixtures]. Platform ids on CoinGecko
differ from DexScreener chain ids ( binance-smart-chain vs bsc, arbitrum-one vs arbitrum)
— keep a mapping table in parse.ts.
5.12 DexScreener API (keyless)
Base URL https://api.dexscreener.com . Verified from the reference page: endpoints /
latest/dex/search (GET), /latest/dex/pairs/{chainId}/{pairId}  (GET), /token-pairs/v1/
{chainId}/{tokenAddress}  (GET), /tokens/v1/{chainId}/{tokenAddresses}  (GET), /orders/v1/
{chainId}/{tokenAddress} , /token-boosts/latest/v1 , /token-boosts/top/v1; and /token-
profiles/latest/v1, /token-profiles/recent-updates/v1 , /community-takeovers/latest/v1 , /
ads/latest/v1, /metas/trending/v1, /metas/meta/v1/{slug}  at 60 req/min. Per-endpoint
limits for the pair/search endpoints are in an external OpenAPI spec not visible on the
page; the widely cited value is 300 req/min [VERIFY]. The older /latest/dex/tokens/
{tokenAddresses} path named in the brief was not in the fetched list [VERIFY it still
responds; prefer /token-pairs/v1/{chainId}/{tokenAddress}  when the chain is known and /
latest/dex/search?q=<address or symbol>  when it is not].
Verified pair object fields: chainId, dexId, url, pairAddress, labels, 
baseToken{address,name,symbol} , quoteToken, priceNative, priceUsd, 
txns{<window>{buys,sells}} , volume{<window>}, priceChange{<window>} , 
liquidity{usd,base,quote} , fdv, marketCap, pairCreatedAt, 
info{imageUrl,websites,socials} , boosts. Windows are m5, h1, h6, h24 [VERIFY]. /latest/
dex/search and /latest/dex/pairs/...  wrap results as {schemaVersion, pairs: Pair[]} ; the
/token-pairs/v1 and /tokens/v1 endpoints return a bare Pair[] [VERIFY]. priceUsd, fdv, 
marketCap arrive as strings/numbers inconsistently — coerce with Number() and treat NaN
as missing. Chain ids used: ethereum, bsc, base, solana, arbitrum, polygon [VERIFY list].
5.13 CoinMarketCap (optional, off in MVP)
Base URL https://pro-api.coinmarketcap.com , header X-CMC_PRO_API_KEY. Endpoints if
enabled: GET /v2/cryptocurrency/quotes/latest?symbol=<SYM>&convert=USD , GET /v2/
cryptocurrency/info?symbol=<SYM>  (urls, tags, date_added, logo), GET /v1/cryptocurrency/map?
symbol=<SYM>. Basic plan: 10,000 credits/month, 30 req/min [VERIFY]. Blocking issue: an
Executa's credentials[] are host-injected per user; there is no documented developer-held
server secret on the fetched pages, and a key must never ship inside the npm package.
Enable only after that is resolved.
5.14 Gotchas
console.log in the Executa corrupts the protocol stream — use console.error; add an
ESLint rule banning console.log in executa/src.
executa.json without both tool_id and type is silently skipped by the harness.
1. 
2. 

tools.invoke needs the tool in required_executas and in ui.host_api.tools; 
permission_denied otherwise.
External fetch() inside the iframe is CSP-blocked by default — do not move data
fetching into the UI "just for testing".
llm.complete output is clamped at 4096 tokens; the Persian translation of a long brief
must fit in one call — keep the English prose under ~350 words.
Sync tool calls are capped at 90 s host-side; keep upstream timeouts at 8 s per HTTP
call so three calls plus retries stay under 25 s.
Line size caps (512 KiB soft) — never return raw API payloads to the UI; map to the 
Brief fields.
user_message_prefix_template  must contain exactly one {user_message}; 
system_prompt_addendum  ≤4000 chars; summary_template ≤400.
Review budget is 5 submissions/day — do not burn it on typo fixes; use apps push to the
draft and cut once.
The scaffold's schema value and the dev block are the harness's contract; the CLI strips 
dev on publish, so nothing in it can be load-bearing.
CoinGecko's public limit is shared per IP and "varies with traffic" — build for 429s from
day one (Chapter 4 §4.8).
T wo doc pages disagree on the credentials path and on the exact --llm flag form; the
CLI's --help output wins.
5.15 Caching policy
As specified in Chapter 4 §4.9: per-process TTL map with stale-while-revalidate, single-
flight, 500-entry LRU; no cross-user cache in the MVP . Every response the UI renders
carries meta.data_as_of and the UI shows the age when it exceeds 2 min.
5.16 Fallback matrix
If Trigger Then
Node Executa scaf‐
fold/harness fails
executa init --tem‐
plate node broken, or
the harness cannot
spawn node
anna-app executa init --template python  (uv); port
the four tools with httpx; same tool names and para‐
meters, UI unchanged
llm.complete un‐
available to the UI
permission_denied / 
llm_disabled in pro‐
duction despite the
grant
Prompt-instruction-driven app: sys‐
tem_prompt_addendum  runs the four tools in chat and
the assistant writes the prose; the window shows num‐
bers, flags and share text only. Second option: Executa-
side sampling ( sampling/createMessage , host_capab‐
ilities: ["llm.sample"] )
DexScreener
blocked from
Anna's egress
403/timeout on 
api.dexscreener.com  in
production
CoinGecko-only mode: liquidity flags become "n/a", 
listing_age_days from genesis_date, on-chain-only
tokens return "not found — paste a CoinGecko-listed
ticker"
3. 
4. 
5. 
6. 
7. 
8. 
9. 
10. 
11. 
12. 

If Trigger Then
CoinGecko rate-lim‐
ited
persistent 429 DexScreener-first resolution; serve stale ≤15 min; re‐
duce to 1 CoinGecko call per run ( /coins/{id} only,
search cached 24 h); Demo key if a server-side secret
path exists
npm distribution
not accepted for
production
Discord answer or ex‐
ecuta publish error
.tar.gz with distribution_type: local  [VERIFY prod
support] or a single binary via @yao-pkg/pkg; last re‐
sort: Go template
SDK envelope dif‐
fers from docs
first tools.invoke re‐
turns {ok, result}
wrapper normalises res.result ?? res; no other code
changes
form_factors:
["mobile"] fails
validation or review
validator error / review
note
ship ["desktop"] in 0.1.0; add mobile in 0.2.0 after
the desktop journey is stable
Store review not
done by 30 Sep
Console still 
PENDING_REVIEW
DoraHacks BUIDL with the pending link and a dated
note; edit after approval (Chapter 2 §2.8)
anna-app dev
needs uv and it
will not install
doctor fails install uv via pip install uv or the standalone bin‐
ary; it is only a prerequisite check for the harness

