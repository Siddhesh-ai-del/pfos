"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Reset demo data back to Seed state (§2.3). Mid-demo recovery path.
export function TopBar({ monthLabel }: { monthLabel: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reset() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "reset failed");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <header className="rule-t border-rule">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 md:px-8">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-[18px] font-semibold tracking-tight">
            PFOS
          </span>
          <span className="text-[13px] text-ink-2">{monthLabel}</span>
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-[13px] text-over">{error}</span>}
          <button
            type="button"
            onClick={reset}
            disabled={busy}
            aria-label="Reset demo data"
            className="stamp-settle rounded-button border border-rule bg-card px-3 py-2 text-[13px] text-ink-2 hover:text-ink disabled:opacity-50"
          >
            <span aria-hidden="true">↺</span> Reset demo
          </button>
        </div>
      </div>
    </header>
  );
}
