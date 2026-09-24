# S1 — scaffold and protocol (2026-09-25)

- `anna-app init tokenbrief-anna --slug tokenbrief` scaffolded a schema-2 manifest, `app.json`
  (name/tagline/description/category), `bundle/index.html` + `bundle/app.js` (moved to
  `docs/scaffold-reference/`) and a Python executa (replaced by the Node/TS one).
- `anna-app executa init --template node` (checked in a scratch dir) writes `executa.json`
  `{slug, name, version, executa_type, description, tool_id: "tool-dev-<slug>", type: "node"}`
  and a `package.json` whose `bin` key is the tool id.
- Harness discovery (`anna-app dev --help`, reference/cli.md): `executas/<name>/executa.json`
  first (`tool_id` + `type` required; optional argv `command`, cwd = that dir). Ours:
  `command: ["node", "dist/plugin.js"]`. The harness does NOT run `npm install` — the Executa
  has zero runtime deps.
- Observed at `anna-app dev` start:
  `executas tool-dev-tokenbrief` · `bundled handles tokenbrief→tool-dev-tokenbrief` ·
  `llm bridge mock (fixtures/llm/replies.jsonl)` · `storage backend legacy`.
- First start needs `uvx anna-app-runtime-local@0.2.0a23`; the download exceeded the 8 s bridge
  timeout once. Warm it with `uvx --from anna-app-runtime-local==0.2.0a23 python -c "print(1)"`.
- Protocol checks (test/protocol.test.ts, built plugin over real stdio): bare describe with 4
  tools and `parameters[]` (each with description), `health.status == "healthy"`, unknown
  method/tool → -32601, malformed line → -32700, bad args → -32602, notification unanswered,
  `shutdown` answered, clean exit on stdin EOF, nothing but JSON on stdout.
- `anna-app executa dev --describe` was not used: the full harness path covers it.
