// executas/tokenbrief/src/num.ts — DexScreener sends numbers as strings or numbers.
export function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export const positive = (v: unknown): number | null => {
  const n = num(v);
  return n !== null && n > 0 ? n : null; // CoinGecko reports 0 for "unknown" caps
};
