"use client";

import * as React from "react";
import type { FinContext } from "@/components/HomeContent";
import { TopBar } from "@/components/TopBar";
import { ChatPane } from "@/components/ChatPane";
import { ContextInstruments } from "@/components/instruments/ContextInstruments";
import { CommandMenu } from "@/components/command-menu";
import { HelpDialog } from "@/components/help-dialog";
import { ManualCaptureDialog } from "@/components/manual-capture-dialog";
import { useCountUp } from "@/components/ui/count-up";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/demo";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

export function InboxShell({
  context,
  monthLabel,
}: {
  context: FinContext;
  monthLabel: string;
}) {
  const [instrumentsOpen, setInstrumentsOpen] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [captureOpen, setCaptureOpen] = React.useState(false);
  const [splitView, setSplitView] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const monthExpense = context.budgets.reduce((acc, b) => acc + b.spent, 0);
  const animatedSpend = useCountUp(monthExpense);

  const openTrace = () => window.dispatchEvent(new CustomEvent("pfos:open-trace"));
  const focusComposer = () => window.dispatchEvent(new CustomEvent("pfos:focus-composer"));
  const capture = (text: string) => window.dispatchEvent(new CustomEvent("pfos:capture", { detail: text }));

  return (
    <div className="flex h-dvh min-h-dvh flex-col bg-paper text-ink">
      <TopBar
        monthLabel={monthLabel}
        ledgerDay={context.day}
        pendingEstimates={context.open_estimated_count}
        onOpenInstruments={() => setInstrumentsOpen(true)}
      />

      <main className="mx-auto flex w-full max-w-7xl min-h-0 flex-1 flex-col px-4 pb-3 pt-3 md:px-6 md:pb-4">
        <div className="mb-3 flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-rule pb-2.5">
          <div className="flex items-center gap-2">
            <span className="label-tech text-copper">01</span>
            <span className="label-tech">Inbox</span>
          </div>
          <div className="h-3 w-px bg-rule" aria-hidden="true" />
          <p className="num font-mono text-[12px] text-ink-2">
            Month spend{" "}
            <span className="text-ink">{formatINR(animatedSpend)}</span>
          </p>
          {context.open_estimated_count > 0 && (
            <Badge variant="estimate">
              {context.open_estimated_count} pending estimate
              {context.open_estimated_count > 1 ? "s" : ""}
            </Badge>
          )}
          <p className="ml-auto hidden text-[12px] text-ink-2 lg:block">
            ⌘K commands · capture in one sentence · confirm before it settles
          </p>
        </div>

        <div className="min-h-0 flex-1">
          {isDesktop && splitView ? (
            <ResizablePanelGroup orientation="horizontal" className="h-full gap-3">
              <ResizablePanel defaultSize={62} minSize={40}>
                <div className="h-full min-h-0"><ChatPane contextDay={context.day} /></div>
              </ResizablePanel>
              <ResizableHandle withHandle className="mx-0" />
              <ResizablePanel defaultSize={38} minSize={24}>
                <aside className="surface-instrument flex h-full min-h-0 flex-col overflow-hidden">
                  <div className="border-b border-rule px-3 py-2.5">
                    <p className="label-tech text-copper-fg">Instruments · pinned</p>
                    <p className="font-display text-[18px] tracking-tight">Financial context</p>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto p-3">
                    <ContextInstruments context={context} />
                  </div>
                </aside>
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <ChatPane contextDay={context.day} />
          )}
        </div>
      </main>

      {isDesktop ? (
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
      ) : (
        <Drawer open={instrumentsOpen} onOpenChange={setInstrumentsOpen}>
          <DrawerContent className="max-h-[88vh]">
            <DrawerHeader>
              <div className="flex items-center gap-2"><Badge variant="copper">INSTRUMENTS</Badge><span className="label-tech">{monthLabel}</span></div>
              <DrawerTitle>Financial context</DrawerTitle>
              <DrawerDescription>Deterministic values from your ledger context.</DrawerDescription>
            </DrawerHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
              <ContextInstruments context={context} />
            </div>
          </DrawerContent>
        </Drawer>
      )}

      <CommandMenu
        onOpenInstruments={() => setInstrumentsOpen(true)}
        onOpenTrace={openTrace}
        onOpenHelp={() => setHelpOpen(true)}
        onOpenCapture={() => setCaptureOpen(true)}
        onToggleSplit={() => setSplitView((v) => !v)}
        splitView={splitView}
      />
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <ManualCaptureDialog open={captureOpen} onOpenChange={setCaptureOpen} onCapture={capture} />
    </div>
  );
}
