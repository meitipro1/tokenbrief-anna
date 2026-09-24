# TokenBrief on Anna — project instructions for Claude Code

## What this is
An Anna Marketplace App (schema 2): a Node.js/TypeScript Executa (`executas/tokenbrief/`)
exposing four tools — resolve_token, fetch_metrics, fetch_pairs, risk_flags — plus a
React + Vite UI bundle (`ui/` → built into `bundle/`) that calls those tools through the Anna
host API and writes the brief's prose with `anna.llm.complete`. Spec: docs/roadmap/ch06.md
(types, rules, prompt). Platform facts: docs/anna-facts.md. Deviations: docs/decisions.md.
Never contradict any of them without updating them in the same commit.

## Commands
- pnpm install                       # workspace: ui, executas/tokenbrief
- pnpm build                         # manifest addendum → executa dist/ → vite → bundle/
- pnpm test                          # vitest in both packages (executa builds first)
- pnpm smoke -- <query>              # scripts/smoke.ts: the 4 tools over real JSON-RPC, live APIs
- pnpm release:check                 # build + typecheck + tests + validate --strict + bundle rules
- anna-app validate --bundle bundle --strict
- LLM_MODE=mock pnpm dev             # harness at http://localhost:5180 (mock LLM)
- anna-app dev --bundle bundle       # real llm.complete when logged in (spends quota)
- pnpm --filter @meitipro1/tokenbrief-executa package:binaries   # release/*.tar.gz|zip

## Hard rules (read before writing code)
1. Executa stdout is protocol-only: one JSON-RPC 2.0 response per line. Log to stderr only.
   Never console.log in executas/.
2. `describe` returns the bare manifest. Tools declare `parameters: [...]`, NOT input_schema.
3. `invoke` results are `{ success: true, data, tool }` or `{ success: false, error }`.
   Unknown method or tool → -32601; bad arguments → -32602. The loop reads stdin until EOF.
4. Numbers never come from the model. LLM output may contain only {F#}/{D1} placeholders;
   ui/src/synthesis/validate.ts enforces this. Do not weaken it; do not reword the prompt.
5. Every metric is `Sourced<T>` with `source` and `asOf`.
6. Risk thresholds live in executas/tokenbrief/src/clients/config.ts. No literals in rules.
7. No user API keys, no wallets, no trading, no paid data. CoinGecko and DexScreener are keyless.
8. The UI never fetches external hosts (CSP + execution records); all data via tools.invoke.
9. Bundle: relative asset paths, no inline scripts, no viewport meta, no hover-only actions,
   ≥ 44px touch targets, works at 320px, safe-area insets.
10. The Executa is referenced as `bundled:tokenbrief` (manifest) / `window.__ANNA_TOOL_IDS__`
    (UI). Never paste a raw tool id into manifest.json or the UI.
11. executas/tokenbrief/src/types.ts and ui/src/types.ts stay identical (release:check fails).
12. TypeScript strict; keep lines ≤ 100 chars.

## Definition of done for any task
- `pnpm release:check` passes.
- New behaviour has a vitest test, a replay fixture, or a smoke case.
- Platform-facing changes (manifest, protocol, host API) cite the doc line in the commit.
- Commits: Conventional Commits, authored as meitipro1, no Co-Authored-By trailer.

## Do not
- Do not add MCP-style input_schema, tools/list or tools/call to the Executa.
- Do not bundle Executa code inside the UI bundle.
- Do not add analytics, trackers or external fonts to the UI.
- Do not invent Anna API names: if docs/anna-facts.md lacks it, check the live docs
  (https://anna.partners/llms.txt, every page has a .md variant) and record it there first.
