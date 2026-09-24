#!/usr/bin/env bash
# scripts/dev.sh — run the local Anna harness against the built bundle and the built Node
# Executa (auto-discovered from executas/tokenbrief/executa.json).
#   LLM_MODE=mock (default) — canned llm.complete from fixtures/llm/replies.jsonl (offline)
#   LLM_MODE=real           — real host LLM via `anna-app login` (spends your quota)
#   LLM_MODE=off            — llm.complete returns llm_disabled (template brief path)
set -euo pipefail
LLM_MODE="${LLM_MODE:-mock}"
case "$LLM_MODE" in
  mock) LLM_FLAGS=(--mock-llm fixtures/llm/replies.jsonl) ;;
  real) LLM_FLAGS=() ;;
  *) LLM_FLAGS=(--no-llm) ;;
esac
exec anna-app dev --port "${PORT:-5180}" --user-id 1 --bundle bundle "${LLM_FLAGS[@]}"
