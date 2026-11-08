"use client";

import * as React from "react";
import type { FinContext } from "@/components/HomeContent";
import { TopBar } from "@/components/TopBar";
import { ChatPane } from "@/components/ChatPane";
import { ContextInstruments } from "@/components/instruments/ContextInstruments";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/demo";

export function InboxShell({
  context,
  monthLabel,
}: {
  context: FinContext;
  monthLabel: string;
}) {
  const [instrumentsOpen, setInstrumentsOpen] = React.useState(false);
  const monthExpense = context.budgets.reduce((acc, b) => acc + b.spent, 0);

  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <TopBar
        monthLabel={monthLabel}
        onOpenInstruments={() => setInstrumentsOpen(true)}
      />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-4 pt-4 md:px-6">
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-rule pb-3">
          <div className="flex items-center gap-2">
            <span className="label-tech text-copper">01</span>
            <span className="label-tech">Inbox</span>
          </div>
          <div className="h-3 w-px bg-rule" aria-hidden="true" />
          <p className="num font-mono text-[12px] text-ink-2">
            Month spend{" "}
            <span className="text-ink">{formatINR(monthExpense)}</span>
          </p>
          {context.open_estimated_count > 0 && (
            <Badge variant="estimate">
              {context.open_estimated_count} pending estimate
              {context.open_estimated_count > 1 ? "s" : ""}
            </Badge>
          )}
          <p className="ml-auto hidden text-[12px] text-ink-2 lg:block">
            Capture in one sentence. Review the draft. Confirm before it settles.
          </p>
        </div>

        <div className="min-h-0 flex-1">
          <ChatPane contextDay={context.day} />
        </div>
      </main>

      <Sheet open={instrumentsOpen} onOpenChange={setInstrumentsOpen}>
        <SheetContent side="right" className="flex w-[min(94vw,460px)] flex-col p-0 sm:max-w-[460px]">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <Badge variant="copper">INSTRUMENTS</Badge>
              <span className="label-tech">{monthLabel}</span>
            </div>
            <SheetTitle>Financial context</SheetTitle>
            <SheetDescription>
              Deterministic values from your ledger context. Use chat to capture;
              confirm drafts before they settle.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <ContextInstruments context={context} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
