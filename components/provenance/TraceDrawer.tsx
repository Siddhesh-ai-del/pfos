"use client";

import * as React from "react";
import { Activity, ArrowDown, Database, FileSearch, ShieldCheck } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

function toolLabel(name: string): string {
  return name.replace(/^pfos_(ledger|meal|memory)_/, "").replace(/_/g, " ");
}

export function TraceDrawer({
  open,
  onOpenChange,
  tools,
  contextDay,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tools: string[];
  contextDay?: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col p-0">
        <SheetHeader className="bg-surface-2/15">
          <div className="flex items-center gap-2">
            <Badge variant="copper">TRACE</Badge>
            <span className="label-tech">Provenance instrument</span>
          </div>
          <SheetTitle>Honesty trail</SheetTitle>
          <SheetDescription>
            Every figure PFOS shows is grounded in whitelisted tools and ledger
            reads. This panel reveals the path taken for the latest turn.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 px-4 py-4">
          <div className="space-y-4">
            <section className="surface-instrument trace-copper p-3">
              <div className="flex items-center gap-2 text-ink">
                <ShieldCheck className="h-4 w-4 text-confirmed" />
                <span className="font-mono text-[11px] uppercase tracking-wide">
                  Integrity contract
                </span>
              </div>
              <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-ink-2">
                <li>Amounts render from tool/RPC-backed data — never invented.</li>
                <li>Drafts stay provisional until you explicitly confirm.</li>
                <li>Tool calls are validated against a whitelist before execution.</li>
              </ul>
            </section>

            <section>
              <div className="mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4 text-copper" />
                <h3 className="font-mono text-[11px] uppercase tracking-wide text-ink">
                  Latest execution path
                </h3>
              </div>
              {tools.length === 0 ? (
                <div className="surface-inset p-4 text-center">
                  <FileSearch className="mx-auto h-4 w-4 text-ink-2" aria-hidden="true" />
                  <p className="mt-2 text-[13px] text-ink">No tool executed on the latest turn.</p>
                  <p className="mt-1 text-[12px] text-ink-2">
                    The assistant replied from conversation context only.
                  </p>
                </div>
              ) : (
                <ol className="relative space-y-0">
                  {tools.map((t, i) => (
                    <li key={`${t}-${i}`} className="relative pb-3 last:pb-0">
                      {i < tools.length - 1 && (
                        <span
                          className="absolute left-[11px] top-7 h-[calc(100%-10px)] w-px bg-rule"
                          aria-hidden="true"
                        />
                      )}
                      <div className="flex items-start gap-3">
                        <span className="relative z-[1] mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-copper/30 bg-card font-mono text-[10px] text-copper">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0 flex-1 border border-rule bg-surface-2/15 p-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="label-tech text-ink">{toolLabel(t)}</p>
                            <Badge variant="outline" className="normal-case tracking-normal">
                              ok
                            </Badge>
                          </div>
                          <p className="mt-1 break-all font-mono text-[11px] leading-relaxed text-ink-2">
                            {t}
                          </p>
                        </div>
                      </div>
                      {i < tools.length - 1 && (
                        <ArrowDown className="ml-[5px] mt-1 h-3 w-3 text-rule" aria-hidden="true" />
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <Separator />

            <section>
              <div className="mb-2 flex items-center gap-2">
                <Database className="h-4 w-4 text-ink-2" />
                <h3 className="font-mono text-[11px] uppercase tracking-wide text-ink">
                  Snapshot metadata
                </h3>
              </div>
              <dl className="surface-inset grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 p-3 text-[12px]">
                <dt className="label-tech">Ledger day</dt>
                <dd className="font-mono num text-ink">{contextDay ?? "—"}</dd>
                <dt className="label-tech">Source</dt>
                <dd className="font-mono text-ink">Executor envelopes / RPC</dd>
                <dt className="label-tech">Guardrails</dt>
                <dd className="font-mono text-ink">Whitelist · Zod · audit</dd>
                <dt className="label-tech">Settlement</dt>
                <dd className="font-mono text-ink">Explicit confirm required</dd>
              </dl>
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
