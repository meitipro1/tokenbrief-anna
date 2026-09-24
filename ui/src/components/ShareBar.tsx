import { useState } from "react";
import type { Strings } from "../i18n";

/** Copy share card / copy full brief (clipboard with a textarea fallback), 2 s "Copied". */
export function ShareBar(p: { s: Strings; shareText: string; briefText: string;
  dir: "ltr" | "rtl" }) {
  const [copied, setCopied] = useState<"share" | "brief" | null>(null);
  async function copy(kind: "share" | "brief") {
    await copyText(kind === "share" ? p.shareText : p.briefText);
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  }
  return (
    <section className="space-y-2">
      <pre className="whitespace-pre-wrap break-words rounded-lg border border-[var(--line)]
        bg-[var(--card)] p-3 font-sans text-[14px]" dir={p.dir}>{p.shareText}</pre>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="tap flex-1 rounded-lg bg-[var(--accent)] px-4 font-semibold
          text-[var(--on-accent)]" onClick={() => void copy("share")}>
          {copied === "share" ? p.s.copied : p.s.copyShare}
        </button>
        <button type="button" className="tap flex-1 rounded-lg border border-[var(--line)] px-4"
          onClick={() => void copy("brief")}>
          {copied === "brief" ? p.s.copied : p.s.copyBrief}
        </button>
      </div>
    </section>
  );
}

export async function copyText(t: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(t);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = t;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}
