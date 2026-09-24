// ui/src/run/machine.ts — the ch06 §6.8 run state machine as a reducer.
//   idle ─submit→ resolving ─resolved→ fetching → flagging → synthesizing → ready
//   resolving ─ambiguous→ choosing ─pick→ resolving;  any ─fail→ error{code}
//   ready ⇄ translating;  ready ⇄ chat
import type { Candidate } from "../types";
import type { RunError, Step } from "./runBrief";

export type State =
  | { k: "idle" }
  | { k: Step }
  | { k: "choosing"; candidates: Candidate[]; symbol: string }
  | { k: "ready" }
  | { k: "translating" }
  | { k: "chat" }
  | { k: "error"; code: RunError };

export type Event =
  | { type: "submit" }
  | { type: "step"; step: Step }
  | { type: "ambiguous"; candidates: Candidate[]; symbol: string }
  | { type: "pick" }
  | { type: "cancel" }
  | { type: "done" }
  | { type: "fail"; code: RunError }
  | { type: "translate" }
  | { type: "translated" }
  | { type: "ask" }
  | { type: "answered" };

const BUSY = new Set(["resolving", "fetching", "flagging", "synthesizing"]);

export function reduce(s: State, e: Event): State {
  switch (e.type) {
    case "submit":
    case "pick":
      return BUSY.has(s.k) ? s : { k: "resolving" };
    case "step":
      return BUSY.has(s.k) ? { k: e.step } : s;
    case "ambiguous":
      return { k: "choosing", candidates: e.candidates, symbol: e.symbol };
    case "cancel":
      return s.k === "choosing" ? { k: "idle" } : s;
    case "done":
      return { k: "ready" };
    case "fail":
      return { k: "error", code: e.code };
    case "translate":
      return s.k === "ready" ? { k: "translating" } : s;
    case "translated":
      return s.k === "translating" ? { k: "ready" } : s;
    case "ask":
      return s.k === "ready" ? { k: "chat" } : s;
    case "answered":
      return s.k === "chat" ? { k: "ready" } : s;
  }
}

export const isBusy = (s: State) => BUSY.has(s.k);
export const hasBrief = (s: State) => s.k === "ready" || s.k === "translating" || s.k === "chat";
