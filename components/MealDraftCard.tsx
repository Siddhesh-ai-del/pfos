"use client";

import { useState } from "react";
import dayjs from "dayjs";

// MealDraftCard (docs/design-direction.md): statuses are not billing events —
// no price, no ₹, just the truth about what happened to the meal.

export type MealCardVM = {
  kind: "meal_draft" | "meal_confirmed";
  id: string;
  meal: string;
  status: "consumed" | "skipped" | "cancelled";
  occurred_on: string;
  note: string | null;
  /** estimated until the user confirms — mirrors meal_consumption.record_status */
  record_status: "estimated" | "confirmed";
};

const STATUS_STYLE: Record<MealCardVM["status"], string> = {
  consumed: "text-ink",
  skipped: "text-estimate",
  cancelled: "text-over",
};

export function MealDraftCard({
  card,
  onConfirmed,
}: {
  card: MealCardVM;
  onConfirmed: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmed = card.record_status === "confirmed";
  const meal = card.meal.replace(/_/g, " ");
  const day = dayjs(card.occurred_on).format("MMM D");

  async function confirm() {
    if (busy || confirmed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity: "meal", id: card.id }),
      });
      if (!res.ok) throw new Error("confirm failed");
      onConfirmed(card.id);
    } catch {
      setError("I couldn't reach the ledger. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`mt-2 w-full rounded-card p-3 ${
        confirmed ? "card--confirmed" : "card--draft stamp-settle"
      }`}
      role="group"
      aria-label={
        confirmed
          ? `Confirmed tiffin record: ${card.status} ${meal}`
          : `Estimated tiffin record: ${card.status} ${meal}`
      }
    >
      <div className="flex items-center justify-between gap-4">
        <span
          className={`font-mono text-[10px] uppercase tracking-widest ${
            confirmed ? "text-confirmed" : "text-estimate"
          }`}
        >
          {confirmed ? "Confirmed" : "Estimated"} · tiffin
        </span>
        <span className="num text-[11px] text-ink-2">{day}</span>
      </div>
      <p className={`mt-1 text-[15px] font-medium capitalize text-ink`}>
        {meal}{" "}
        <span className={`num ${STATUS_STYLE[card.status]}`}>
          — {card.status}
        </span>
      </p>
      {card.note && <p className="mt-1 text-[13px] text-ink-2">{card.note}</p>}
      {confirmed ? (
        <p className="num mt-2 border-t border-rule pt-2 text-[11px] uppercase tracking-widest text-confirmed">
          Meal recorded
        </p>
      ) : (
        <div className="mt-2 flex items-center justify-between gap-3 border-t border-rule pt-2">
          <p className="text-[11px] leading-snug text-ink-2">
            Bills nothing until you confirm — statuses are never assumed.
          </p>
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            aria-label={`Confirm ${card.status} ${meal}`}
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
