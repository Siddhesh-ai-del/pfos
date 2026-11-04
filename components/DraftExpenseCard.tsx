"use client";

import { useState } from "react";
import dayjs from "dayjs";
import { formatINR } from "@/lib/demo";

// DraftExpenseCard (docs/design-direction.md §4.4, §4.6): dashed pencil-toned
// "Estimated" card; Confirm stamps it (the one signature motion).

export type TransactionCardVM = {
  kind: "transaction_draft" | "transaction_confirmed";
  id: string;
  amount_in_minor_paise: number;
  category: string | null;
  occurred_on: string;
  note: string | null;
  status: "estimated" | "confirmed";
};

export function DraftExpenseCard({
  card,
  onConfirmed,
}: {
  card: TransactionCardVM;
  onConfirmed: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmed = card.status === "confirmed";

  async function confirm() {
    if (busy || confirmed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity: "transaction", id: card.id }),
      });
      if (!res.ok) throw new Error("confirm failed");
      onConfirmed(card.id);
    } catch {
      setError("I couldn't reach the ledger. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const day = dayjs(card.occurred_on).format("MMM D");
  const category = card.category ?? "spend";

  return (
    <div
      className={`mt-2 w-full rounded-card p-3 ${
        confirmed ? "card--confirmed" : "card--draft stamp-settle"
      }`}
      role="group"
      aria-label={confirmed ? "Confirmed expense draft" : "Estimated expense draft"}
    >
      <div className="flex items-center justify-between gap-4">
        <span
          className={`font-mono text-[10px] uppercase tracking-widest ${
            confirmed ? "text-confirmed" : "text-estimate"
          }`}
        >
          {confirmed ? "Confirmed" : "Estimated"}
        </span>
        <span className="num text-[11px] text-ink-2">{day}</span>
      </div>
      <p className="num mt-1 font-display text-[28px] leading-none font-semibold text-ink">
        {formatINR(card.amount_in_minor_paise)}
      </p>
      <p className="mt-1 text-[13px] capitalize text-ink">
        {category}
        {card.note && (
          <span className="text-ink-2"> · {card.note}</span>
        )}
      </p>
      {confirmed ? (
        <p className="num mt-2 border-t border-rule pt-2 text-[11px] uppercase tracking-widest text-confirmed">
          Ledger accepted
        </p>
      ) : (
        <div className="mt-2 flex items-center justify-between gap-3 border-t border-rule pt-2">
          <p className="text-[11px] leading-snug text-ink-2">
            Saved as an estimate. Nothing hits the ledger until you confirm.
          </p>
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            aria-label={`Confirm expense draft of ${formatINR(
              card.amount_in_minor_paise
            )}`}
            className="stamp-settle shrink-0 rounded-button border border-ink bg-ink px-4 py-2 text-[13px] font-medium text-paper disabled:opacity-40"
          >
            {busy ? "Stamping…" : "Confirm"}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-[12px] text-over">
          {error}
        </p>
      )}
    </div>
  );
}
