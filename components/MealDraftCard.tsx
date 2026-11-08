"use client";

import { useState } from "react";
import dayjs from "dayjs";
import { Check, UtensilsCrossed, Fingerprint } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type MealCardVM = {
  kind: "meal_draft" | "meal_confirmed";
  id: string;
  meal: string;
  status: "consumed" | "skipped" | "cancelled";
  occurred_on: string;
  note: string | null;
  record_status: "estimated" | "confirmed";
};

const STATUS_VARIANT: Record<MealCardVM["status"], "default" | "estimate" | "over"> = {
  consumed: "default",
  skipped: "estimate",
  cancelled: "over",
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
  const day = dayjs(card.occurred_on).format("MMM D, YYYY");

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
      className={cn(
        "mt-3 w-full rounded-[var(--radius-card)] border p-3.5 transition-[border-color,background-color] duration-[var(--dur-base)]",
        confirmed
          ? "receipt-confirmed border-confirmed/20 bg-surface-2/20"
          : "border-dashed border-estimate/45 bg-estimate/[0.045] trace-copper"
      )}
      role="group"
      aria-label={
        confirmed
          ? `Confirmed tiffin record: ${card.status} ${meal}`
          : `Estimated tiffin record: ${card.status} ${meal}`
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="h-3.5 w-3.5 text-copper-fg" aria-hidden="true" />
          <Badge variant={confirmed ? "confirmed" : "estimate"}>
            {confirmed ? "Confirmed" : "Estimated"}
          </Badge>
          <span className="label-tech">Tiffin</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="num font-mono text-[11px] text-ink-2">{day}</span>
          <Popover>
            <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Meal audit"><Fingerprint className="h-3.5 w-3.5" /></Button></PopoverTrigger>
            <PopoverContent align="end" className="w-64"><p className="label-tech mb-1 text-copper-fg">Meal record</p><p className="font-mono text-[11px] text-ink-2 break-all">{card.id}</p><p className="mt-1 text-[12px] text-ink">{meal} · {card.status} · {card.record_status}</p></PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <p className="font-display text-[26px] leading-none capitalize text-ink">
          {meal}
        </p>
        <Badge variant={STATUS_VARIANT[card.status]} className="capitalize">
          {card.status}
        </Badge>
      </div>

      {card.note && <p className="mt-2 text-[13px] text-ink-2">{card.note}</p>}

      {confirmed ? (
        <div className="stamp-in mt-3 flex items-center gap-2 border-t border-rule pt-2.5">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-confirmed/15 text-confirmed">
            <Check className="h-3 w-3" />
          </span>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wide text-confirmed">
              Meal recorded
            </p>
            <p className="text-[11px] text-ink-2">Status confirmed — not assumed.</p>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2.5 border-t border-rule pt-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-[36ch] text-[12px] leading-snug text-ink-2">
            Statuses are never assumed. Confirm to record this meal event.
          </p>
          <Button
            type="button"
            onClick={confirm}
            disabled={busy}
            aria-label={`Confirm ${card.status} ${meal}`}
            className="sm:shrink-0"
          >
            {busy ? "Stamping…" : "Confirm"}
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 font-mono text-[12px] text-over">
          {error}
        </p>
      )}
    </div>
  );
}
