"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PanelRightOpen, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function TopBar({
  monthLabel,
  ledgerDay,
  pendingEstimates,
  onOpenInstruments,
}: {
  monthLabel: string;
  ledgerDay?: string;
  pendingEstimates?: number;
  onOpenInstruments?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function reset() {
    setBusy(true);
    const t = toast.loading("Resetting demo…");
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "reset failed");
      }
      router.refresh();
      toast.success("Demo reset to seed state", { id: t });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reset failed", { id: t });
    } finally {
      setBusy(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper/92 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="label-tech text-copper">PFOS</span>
            <span className="font-display text-[22px] leading-none tracking-tight text-ink">
              Ledger
            </span>
          </div>
          {ledgerDay ? (
            <Badge variant="outline" className="hidden sm:inline-flex num font-normal normal-case tracking-normal">
              {ledgerDay}
            </Badge>
          ) : (
            <Badge variant="outline" className="hidden sm:inline-flex">{monthLabel}</Badge>
          )}
          {pendingEstimates ? (
            <Badge variant="estimate" className="hidden sm:inline-flex">
              {pendingEstimates} pending
            </Badge>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5">

          <TooltipProvider delayDuration={200}>
            {onOpenInstruments && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={onOpenInstruments}
                    aria-label="Open financial instruments"
                  >
                    <PanelRightOpen className="h-4 w-4" />
                    <span className="hidden sm:inline">Instruments</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Context instruments</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={reset}
                  disabled={busy}
                  aria-label="Reset demo data"
                >
                  <RotateCcw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">{busy ? "Resetting" : "Reset"}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset demo</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <ThemeToggle />
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 pb-2 sm:hidden md:px-6">
        <Badge variant="outline">{monthLabel}</Badge>
      </div>
    </header>
  );
}
