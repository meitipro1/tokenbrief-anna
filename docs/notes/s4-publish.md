# S4 — publish and submit for review (your steps, in order)

Everything up to here runs locally. Every step below needs your Anna account, so you run it;
paste the outputs back into this file (or into the Claude session) so the next step can be
checked. Commands are from `anna-app <cmd> --help` (CLI 0.1.53) and apps/app-publish.md.

Target: **PENDING_REVIEW on Sat 26 Sep** (roadmap §8.1). Review budget: 5 submissions/day —
do not burn it on typo fixes; `apps push` to the draft and cut once.

## 0. One-time account setup (browser + terminal)

1. Sign up / sign in at https://anna.partners and verify your email.
2. Open the Developer Console at `/developer` on the Anna web app → accept the Developer
   Terms → optional handle `meitipro1` → **Activate developer access** (browser session only;
   instant). Record the date in `docs/accounts.md` (gitignored).
3. In a terminal at `D:\tokenbrief-anna`:

```bash
anna-app login --host https://nexus.anna.partners
anna-app whoami
anna-app account set-handle meitipro1
```

   If `login` rejects that host, the Developer Console shows the right one; use it everywhere
   below with `--account <host>`.

## 1. Real-LLM end-to-end in the harness (P-9.12)

```bash
pnpm release:check
anna-app dev --port 5180 --bundle bundle
```

With a saved login, `anna-app dev` uses the real host LLM by default (it spends your quota).
Open http://localhost:5180 and run: `PEPE`, `ARB`, a fresh Solana pair from dexscreener.com,
`NOTATOKEN123`; toggle فارسی; ask one follow-up. For each, note in `docs/notes/s3-ui.md`:
did validation pass first try (browser console shows `llm output failed validation: …` when not),
`usage.totalTokens` (RPC log), and whether the prose numbers match the numbers table.

## 2. Build the Executa binaries

```bash
pnpm --filter @meitipro1/tokenbrief-executa package:binaries -- linux-x86_64 linux-aarch64 darwin-x86_64 windows-x86_64
```

Produces `executas/tokenbrief/release/tokenbrief-executa-0.1.0-<platform>.{tar.gz,zip}` —
exactly the `binary_artifacts` paths in `executas/tokenbrief/executa.json`. Then:

```bash
pnpm release:verify
```

It checks every archive holds the right executable format (ELF / Mach-O / PE) and embeds the
current `dist/plugin.cjs` byte for byte, and runs the Windows binary over stdio (describe,
health, invalid query, unknown method). A binary built before the last code change shows
`STALE` and the command fails — rebuild, never cut with it.

## 3. Dry run, then push the working draft

```bash
anna-app apps publish --dry-run
anna-app apps push
anna-app apps sync-meta
```

`apps push` registers the bundled executa (mints `tool-meitipro1-tokenbrief-<uniq>`, caches it
in `executas/tokenbrief/.anna/executa.json`), substitutes it for `bundled:tokenbrief`, writes
`bundle/anna-tool-ids.js` and uploads manifest + bundle. `apps sync-meta` pushes name/tagline/
description/category/urls from `app.json`. Record the minted tool_id and the app id here:

- tool_id: `…`
- app id / slug: `@meitipro1/tokenbrief`

## 4. Listing tab (Console) — things the CLI does not upload

- Logo: **Upload logo** → `content/brand/logo-512.png` (≤ 2 MB).
- Screenshots (max 6 URLs, one per line): after the landing page is deployed, the URLs under
  `https://tokenbrief-anna.vercel.app/shots/…` (see `content/listing.md`).
- Check category = `data`, homepage/support/privacy URLs.

## 5. Cut the version (uploads the binaries, freezes the executa binding)

```bash
pnpm release:verify
anna-app apps cut 0.1.0 --changelog "MVP: token brief from ticker, address or CG/CMC/DexScreener link; risk flags; Persian; share card"
anna-app apps status tokenbrief --json
anna-app apps versions tokenbrief --json
```

Expect the version `0.1.0` with its UI bundle `bundle_ready`. If `cut` complains that
`binary_artifacts` has no minted tool_id, re-run `apps push` once (CLI message says so).

## 6. Pre-flight (apps/app-publish.md §1)

- [ ] Listing fields filled; category `data`.
- [ ] Version 0.1.0 exists; Versions tab → **Validate** → `valid: true`.
- [ ] Bundle `bundle_ready`.
- [ ] You installed and used the app end-to-end on your developer account (App Center detail
      shows the candidate to you) — desktop and phone (mobile shell), rows 1–12 of
      `docs/qa-script.md`.
- [ ] In `/executa` → My Tools, TokenBrief Data's visibility is `app_bundled` (installable with
      the app). If it shows `private`, switch it — otherwise installers get "tool not found".

## 7. Submit

```bash
anna-app apps submit-review --json
```

Status → `PENDING_REVIEW`. Screenshot the Console into `docs/evidence/console-pending.png`,
post the "submitted" note in the Anna Discord, then `git tag v0.1.0`.

## 8. After approval (P-9.20)

```bash
anna-app apps status tokenbrief --json
anna-app apps release 0.1.0
```

`APPROVED` is installable only by direct lookup; `release` makes it `PUBLISHED` (visible in
the store). Then open the store page signed-out, copy the store URL into
`docs/evidence/STORE_LINK.txt`, update the DoraHacks BUIDL, and set `VITE_SHARE_LINK` /
the landing button for 0.1.1 (new versions publish without re-review once approved).

## If rejected (P-9.19)

Paste the reviewer notes verbatim into a Claude session with this repo; fix; `pnpm
release:check`; `anna-app apps push`; `anna-app apps cut 0.1.1`; `anna-app apps submit-review`.
No penalty for multiple rounds.
