"use client";

import { useState } from "react";
import dayjs from "dayjs";
import { Check, ReceiptText, MoreHorizontal, Copy, Fingerprint } from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@/lib/demo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

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

  const day = dayjs(card.occurred_on).format("MMM D, YYYY");
  const category = card.category ?? "spend";

  return (
    <div
      className={cn(
        "mt-3 w-full rounded-[var(--radius-card)] border p-3.5 transition-[border-color,background-color,box-shadow] duration-[var(--dur-base)]",
        confirmed
          ? "receipt-confirmed border-confirmed/20 bg-surface-2/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
          : "border-dashed border-estimate/45 bg-estimate/[0.045] trace-copper"
      )}
      role="group"
      aria-label={confirmed ? "Confirmed expense draft" : "Estimated expense draft"}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="label-tech text-copper-fg">REC</span>
          <Badge variant={confirmed ? "confirmed" : "estimate"}>
            {confirmed ? "Confirmed" : "Estimated"}
          </Badge>
          <span className="label-tech">Expense</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="num font-mono text-[11px] text-ink-2">{day}</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Audit details"><Fingerprint className="h-3.5 w-3.5" /></Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72">
              <p className="label-tech mb-2 text-copper-fg">Audit / receipt</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[12px]">
                <dt className="label-tech">ID</dt><dd className="truncate font-mono text-[11px] text-ink-2">{card.id}</dd>
                <dt className="label-tech">State</dt><dd className="font-mono text-ink">{card.status}</dd>
                <dt className="label-tech">Amount</dt><dd className="num font-mono text-ink">{formatINR(card.amount_in_minor_paise)}</dd>
              </dl>
            </PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Card actions"><MoreHorizontal className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => { void navigator.clipboard?.writeText(card.id); toast.success("Receipt ID copied"); }}><Copy className="mr-2 h-4 w-4" />Copy receipt ID</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-4">
        <div>
          <p className="label-tech">Amount</p>
          <p className="num mt-0.5 font-display text-[34px] leading-none tracking-tight text-ink">
            {formatINR(card.amount_in_minor_paise)}
          </p>
        </div>
        <div className="text-right">
          <p className="label-tech">Category</p>
          <p className="mt-0.5 font-mono text-[12px] uppercase tracking-wide text-ink">
            {category}
          </p>
        </div>
      </div>

      {card.note && (
        <p className="mt-3 border-t border-rule pt-2.5 text-[13px] text-ink-2">
          <span className="label-tech mr-2">Note</span>
          <span className="text-ink">{card.note}</span>
        </p>
      )}

      {confirmed ? (
        <div className="stamp-in mt-3 flex items-center gap-2 border-t border-rule pt-2.5">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-confirmed/15 text-confirmed-fg">
            <Check className="h-3 w-3" />
          </span>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wide text-confirmed-fg">
              Ledger accepted
            </p>
            <p className="text-[11px] text-ink-2">Confirmed and recorded in the ledger.</p>
          </div>
          <ReceiptText className="ml-auto h-3.5 w-3.5 text-ink-2" aria-hidden="true" />
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2.5 border-t border-rule pt-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-[34ch] text-[12px] leading-snug text-ink-2">
            Saved as an estimate. Nothing hits the ledger until you confirm.
          </p>
          <Button
            type="button"
            onClick={confirm}
            disabled={busy}
            aria-label={`Confirm expense draft of ${formatINR(
              card.amount_in_minor_paise
            )}`}
            className="sm:shrink-0"
          >
            {busy ? "Stamping…" : "Confirm"}
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 font-mono text-[12px] text-over-fg">
          {error}
        </p>
      )}
    </div>
  );
}
