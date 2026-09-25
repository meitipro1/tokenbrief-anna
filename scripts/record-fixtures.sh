#!/usr/bin/env bash
# scripts/record-fixtures.sh — re-record the replay fixtures against the live APIs, one query
# per process, spaced so keyless CoinGecko (~5 origin requests/minute per IP) is not exceeded.
# Each run writes fixtures/tools/<name>.jsonl and its raw responses to evidence/<name>/, then
# scripts/fixtures-sync.ts copies those into the Executa's test fixtures.
#   bash scripts/record-fixtures.sh [name ...]      (default: all)
set -uo pipefail
cd "$(dirname "$0")/.."
GAP="${GAP:-65}"
declare -A Q=(
  [pepe]="PEPE"
  [pepe-address]="0x6982508145454ce325ddbe47a25d4ec3d2311933"
  [pepe-cg-url]="https://www.coingecko.com/en/coins/pepe"
  [pepe-cmc-url]="https://coinmarketcap.com/currencies/pepe/"
  [arb]="ARB"
  [btc]="BTC"
  [not-found]="NOTATOKEN123"
  [usdt-address]="0xdAC17F958D2ee523a2206206994597C13D831ec7"
  [wif]="WIF"
  [wif-dex-url]="https://dexscreener.com/solana/EP2ib6dYdEeqD8MfE2ezHCxX3kP3K2eLKkirfPm5eyMx"
  [robin-fresh]="${FRESH:-https://dexscreener.com/solana/daxvbvh3twxuv9mqzmdunzkfmtrhdzasymvqdqo8v1qm}"
)
names=("$@")
[ ${#names[@]} -eq 0 ] && names=(pepe pepe-address pepe-cg-url pepe-cmc-url arb btc not-found usdt-address wif wif-dex-url robin-fresh)
pnpm -s --filter @meitipro1/tokenbrief-executa build >/dev/null
for n in "${names[@]}"; do
  for attempt in 1 2 3; do
    rm -rf "evidence/$n"
    out=$(TOKENBRIEF_EVIDENCE=1 TOKENBRIEF_EVIDENCE_DIR="evidence/$n" \
      pnpm -s smoke -- "${Q[$n]}" --quiet --record "fixtures/tools/$n.jsonl" 2>&1)
    rc=$?
    echo "[$n #$attempt rc=$rc] $(echo "$out" | grep -E 'SUMMARY|status |failed' | tr '\n' ' ')"
    sleep "$GAP"
    [ $rc -eq 0 ] && break
  done
done
pnpm -s tsx scripts/fixtures-sync.ts
