# Anna platform facts (verified)

What this project relies on, each with where it was verified. Re-verify before changing
platform-facing code. "Verified" means read on the live docs (https://anna.partners/developers/…,
fetched 2026-09-24), in the `@anna-ai/cli` 0.1.53 source/help, or observed in `anna-app dev`.

## CLI (`@anna-ai/cli` 0.1.53, `anna-app --help`)

- Commands used: `init`, `validate [--strict]`, `dev`, `doctor`, `login --host`, `whoami`,
  `account set-handle`, `apps push|cut|publish|submit-review|release|status|versions`,
  `executa dev|publish|upload-binaries`, `fixture verify|summarize|replay`.
- Credentials: `anna-app login` writes `~/.config/anna/credentials.json` (help text).
- `anna-app dev --mock-llm <fixture>` takes a JSONL of `{"ns":"llm","method":"complete","result":{…}}`
  (flag form verified; the PDF's `--llm mock` does not exist). Real LLM is the default when
  logged in; `--no-llm` disables it.
- `anna-app dev` needs `uv` and a one-time `uvx anna-app-runtime-local@0.2.0a23` download; the
  first start can exceed the bridge's 8 s ready timeout, so warm it once with
  `uvx --from anna-app-runtime-local==0.2.0a23 python -c "print(1)"` (observed).
- Nexus host for `login`: `https://nexus.anna.partners` (from the official examples repo
  workflow `vars.ANNA_APP_HOST`; confirm with `anna-app login --host https://nexus.anna.partners`).

## Bundled executas (examples repo `whtcjdtc2007/anna-executa-examples`, CLI source)

- `app.json#bundled_executas` maps a handle to a local executa dir:
  `"bundled_executas": { "tokenbrief": { "path": "./executas/tokenbrief" } }`.
- `manifest.json` references it as `bundled:tokenbrief` (in `required_executas` and
  `ui.host_api.tools`). `anna-app apps publish/push` mints the executa, substitutes the minted
  `tool_id` in memory and writes `bundle/anna-tool-ids.js` (`window.__ANNA_TOOL_IDS__`).
  `anna-app dev` does the same with the local id (observed: `bundled handles tokenbrief→tool-dev-tokenbrief`).
- Minted ids are `tool-{handle}-{slug}-{uniq}`; clients cannot choose them (tools/executa-publish.md).
- `executa.json`: required `tool_id` + `type` for `anna-app dev`; publish reads `slug`, `name`,
  `version`, `executa_type`, `description`, `distribution` (flat or `{active, profiles}`).
- Distribution types: `uv | npm | pipx | homebrew | binary | local`. `binary` accepts either
  `binary_urls` (public, pull-mirrored at `apps cut`) or `binary_artifacts` (local archives
  uploaded directly, `executa upload-binaries` / `apps cut`). Platform keys: `darwin-arm64`,
  `darwin-x86_64`, `linux-x86_64`, `linux-aarch64`, `windows-x86_64`, … (reference/executa-distribution.md, CLI).
- Resolution order on the Agent: exact platform → same OS any arch → wildcard → single entry.
- Executas run on the user's Anna Agent: their own machine or a managed Cloud Agent (Linux
  microVM) (reference/executa-cloud-storage.md). No agent online → `agent_unavailable`.

## Executa protocol (reference/executa-protocol.md)

- JSON-RPC 2.0, one LF-terminated line per message, stdout protocol-only, logs on stderr,
  512 KiB soft cap (`__file_transport` above it), 2 MiB hard line cap.
- `initialize` (v2): echo `protocolVersion`, advertise `client_capabilities`.
- `describe` returns the bare manifest (`name`, `display_name`, `version`, `tools[]` with
  `parameters[]` — not `input_schema`). `health` → `{status:"healthy", timestamp, version, tools_count}`.
- `invoke` → `{success:true, data, tool}` or `{success:false, error}`; `success` must be explicit.
- Unknown method **or unknown tool name** → `-32601`; invalid params → `-32602`.
- Invoke timeout default 60 s, per-tool `timeout` (seconds) in describe.

## Manifest (reference/app-manifest.md, ui-manifest.md; `anna-app validate` passes)

- `schema: 2` with a `ui` section; `permissions` is display-only at schema ≤ 2.
- `system_prompt_addendum` ≤ 4000 chars; `user_message_prefix_template` ≤ 500 chars with
  exactly one `{user_message}`.
- `ui.host_api` grants used: `tools: ["required:bundled:tokenbrief"]`, `llm: ["complete"]`,
  `storage: ["get","set"]`, `window: ["set_title"]`. Harness `window.hello` reported scopes
  `tools.required:tool-dev-tokenbrief, llm.complete, storage.get, storage.set, window.set_title,
  window.*` (observed).
- `ui.form_factors: ["desktop","mobile"]` → mobile review checklist applies (apps/app-mobile.md).

## UI SDK (`@anna-ai/app-runtime` 0.16.1 source, apps/app-ui-sdk.md)

- `import { AnnaAppRuntime } from "/static/anna-apps/_sdk/latest/index.js"`; `connect()` needs
  `?wid=&t=` in the iframe URL.
- Every call **resolves to the bare result** and **rejects with an `Error` carrying `.code`**
  (runtime source `_onMessage`). The `{ok, result}` envelope in the SDK page is the wire format,
  not what the promise returns.
- `tools.invoke({tool_id, method, args, timeoutMs})` — `method` required for mint-only ids;
  the host strips the Executa's `{success, data}` and returns the plugin payload (observed in the
  harness RPC log); a plugin `success:false` becomes error code `tool_failed`.
  Timeout clamp 1 s–90 s; SDK default 70 s.
- `llm.complete({messages, systemPrompt, maxTokens, temperature})` →
  `{role, content:{type:'text', text}, model, stopReason, usage, _meta}`; errors
  `APP_NOT_GRANTED | APP_INVALID_REQUEST | APP_QUOTA_EXCEEDED | APP_PROVIDER_ERROR`;
  `maxTokens` silently clamped to 4096 (reference/host-api-llm.md).
- `storage.get({key})` → `{value, exists}` (`{value:null, exists:false}` on miss);
  `storage.set({key, value})`; legacy backend caps 256 KiB per window (reference/host-api-storage.md).

## Publishing (apps/app-publish.md, app-listing.md, app-versioning.md, reference/verified-developer.md)

- Verified Developer: self-service at `/developer` (verify email, accept Developer ToS, optional
  handle, **Activate developer access**); browser session only.
- Listing fields (Console Listing tab or `apps sync-meta` from app.json): name 1–120, slug
  immutable `^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$`, category ∈ productivity | developer-tools |
  creative | data | lifestyle | education | communication | entertainment | utilities, tagline
  ≤ 160, description ≤ 20000, logo (upload ≤ 2 MB → 256×256 WebP), cover URL, ≤ 6 screenshot
  URLs, homepage/support/privacy URLs. Listing edits never need re-review.
- Status: DRAFT → PENDING_REVIEW → APPROVED → PUBLISHED (REJECTED → resubmit, no penalty).
  `apps publish` = push + cut; then `apps submit-review`; after approval `apps release <v>`.
- Submit-review pins the newest cut version as the review candidate and runs a release precheck
  (manifest, executa-binding freeze dry-run, bundle readiness).
- Once APPROVED/PUBLISHED, new versions are published by the developer without re-review.
- Review checks: manifest vs live catalogue, listing copy/screenshots vs behaviour, mobile rows.
  "No enforced SLA" (docs) vs 3–5 business days (program thread).
- Limits: 10 app creations/day, 5 review submissions/day, 20 active apps.
