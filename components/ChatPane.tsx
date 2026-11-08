"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUp, Fingerprint, Sparkles } from "lucide-react";
import {
  DraftExpenseCard,
  type TransactionCardVM,
} from "@/components/DraftExpenseCard";
import {
  MemoryNoteCard,
  type MemoryNoteCardVM,
} from "@/components/MemoryNoteCard";
import { MealDraftCard, type MealCardVM } from "@/components/MealDraftCard";
import {
  ReportCardDaily,
  ReportCardMonthly,
  type ReportCardVM,
} from "@/components/ReportCards";
import { TraceDrawer } from "@/components/provenance/TraceDrawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type ChatCardVM =
  | TransactionCardVM
  | MemoryNoteCardVM
  | MealCardVM
  | ReportCardVM;

type ChatRow =
  | {
      kind: "msg";
      role: "user" | "assistant";
      text: string;
      tools?: string[];
      cards?: ChatCardVM[];
    }
  | { kind: "error"; text: string };

const GREETING: ChatRow = {
  kind: "msg",
  role: "assistant",
  text: 'Ledger ready. Tell me what happened in plain language — "spent ₹120 on lunch", "skipped dinner today", or "show my month". I’ll draft it first; you confirm before anything settles.',
};

function toolLabel(name: string): string {
  return name.replace(/^pfos_(ledger|meal|memory)_/, "");
}

export function ChatPane({ contextDay }: { contextDay?: string }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [rows, setRows] = useState<ChatRow[]>([GREETING]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<
    Array<{ role: "user" | "assistant"; text: string }>
  >([]);
  const [latestTrace, setLatestTrace] = useState<string[]>([]);
  const [traceOpen, setTraceOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end", behavior: reduce ? "auto" : "smooth" });
  }, [rows, busy, reduce]);

  async function send() {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    setDraft("");
    setRows((r) => [...r, { kind: "msg", role: "user", text }]);

    const outgoingHistory = [...history, { role: "user" as const, text }];
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: outgoingHistory.slice(-20) }),
      });
      const body = (await res.json()) as {
        reply?: string;
        refresh?: boolean;
        toolTrace?: string[];
        cards?: unknown[];
      };
      const reply = body.reply ?? "I couldn't answer that. Try again?";
      const cards = (body.cards ?? []).filter((c): c is ChatCardVM => {
        if (typeof c !== "object" || c === null) return false;
        const kind = (c as { kind?: unknown }).kind;
        return (
          typeof kind === "string" &&
          (kind.startsWith("transaction_") ||
            kind.startsWith("meal_") ||
            kind.startsWith("report_") ||
            kind === "memory_note")
        );
      });
      const tools = body.toolTrace?.length ? body.toolTrace : [];
      if (tools.length) setLatestTrace(tools);
      setHistory([...outgoingHistory, { role: "assistant" as const, text: reply }]);
      setRows((r) => [
        ...r,
        {
          kind: "msg",
          role: "assistant",
          text: reply,
          tools: tools.length ? tools : undefined,
          cards: cards.length ? cards : undefined,
        },
      ]);
      if (body.refresh) router.refresh();
    } catch {
      setRows((r) => [
        ...r,
        {
          kind: "error",
          text: "Network hiccup — I couldn't reach the ledger. Try again.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function handleConfirmed(id: string) {
    setRows((r): ChatRow[] =>
      r.map((row): ChatRow =>
        row.kind === "msg" && row.cards
          ? {
              ...row,
              cards: row.cards.map((c): ChatCardVM => {
                if (!("id" in c) || c.id !== id) return c;
                if (c.kind === "meal_draft" || c.kind === "meal_confirmed") {
                  return { ...c, record_status: "confirmed" as const };
                }
                if (
                  c.kind === "transaction_draft" ||
                  c.kind === "transaction_confirmed"
                ) {
                  return { ...c, status: "confirmed" as const };
                }
                return c;
              }),
            }
          : row
      )
    );
    router.refresh();
  }

  return (
    <section aria-label="Assistant inbox" className="flex h-full min-h-[60vh] flex-col">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-copper" aria-hidden="true" />
          <span className="label-tech">Conversation thread</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[11px]"
          onClick={() => setTraceOpen(true)}
          aria-label="Open audit trace"
        >
          <Fingerprint className="h-3.5 w-3.5" />
          <span className="font-mono uppercase tracking-wide">Trace</span>
          {latestTrace.length > 0 && (
            <span className="num ml-0.5 text-copper">{latestTrace.length}</span>
          )}
        </Button>
      </div>

      <div className="surface-instrument relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <ScrollArea className="flex-1">
          <div
            className="px-3 py-4 md:px-4"
            role="log"
            aria-live="polite"
            aria-label="Conversation"
          >
            <ul className="mx-auto flex max-w-3xl flex-col gap-4">
              <AnimatePresence initial={false}>
                {rows.map((row, i) => (
                  <motion.li
                    key={i}
                    initial={reduce ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
                  >
                    {row.kind === "msg" ? (
                      <div
                        className={cn(
                          "flex",
                          row.role === "user" ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[min(100%,42rem)]",
                            row.role === "user" ? "items-end" : "items-start"
                          )}
                        >
                          <div className="mb-1 flex items-center gap-2 px-1">
                            <span className={cn("label-tech", row.role === "assistant" && "text-copper")}>
                              {row.role === "user" ? "You" : "PFOS · Ledger"}
                            </span>
                          </div>
                          <div
                            className={cn(
                              "rounded-[var(--radius-card)] border px-3.5 py-3 text-[14px] leading-relaxed",
                              row.role === "user"
                                ? "border-ink/15 bg-ink text-paper"
                                : "border-rule bg-card text-ink"
                            )}
                          >
                            <p className="whitespace-pre-wrap">{row.text}</p>

                            {row.cards?.map((card) => {
                              switch (card.kind) {
                                case "transaction_draft":
                                case "transaction_confirmed":
                                  return (
                                    <DraftExpenseCard
                                      key={card.id}
                                      card={card}
                                      onConfirmed={handleConfirmed}
                                    />
                                  );
                                case "meal_draft":
                                case "meal_confirmed":
                                  return (
                                    <MealDraftCard
                                      key={card.id}
                                      card={card}
                                      onConfirmed={handleConfirmed}
                                    />
                                  );
                                case "memory_note":
                                  return <MemoryNoteCard key={card.id} card={card} />;
                                case "report_daily":
                                  return <ReportCardDaily key={card.period} card={card} />;
                                case "report_monthly":
                                  return <ReportCardMonthly key={card.period} card={card} />;
                              }
                            })}

                            {row.tools && row.tools.length > 0 && (
                              <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-rule/70 pt-2.5">
                                <span className="label-tech text-copper">Trace</span>
                                {row.tools.map((t) => (
                                  <Badge
                                    key={t}
                                    variant="outline"
                                    title={`Executed whitelisted RPC-backed tool: ${t}`}
                                    className="normal-case tracking-normal"
                                  >
                                    {toolLabel(t)}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        role="alert"
                        className="mx-auto max-w-3xl border border-dashed border-over/40 bg-over/5 px-3 py-2.5 text-[13px] text-over"
                      >
                        <span className="label-tech mr-2 text-over">Error</span>
                        {row.text}
                      </div>
                    )}
                  </motion.li>
                ))}
              </AnimatePresence>

              {busy && (
                <li className="mx-auto flex max-w-3xl items-center gap-3 px-1" aria-label="Reading the ledger">
                  <span className="flex items-center gap-1" aria-hidden="true">
                    <span className="ledger-pulse h-1.5 w-1.5 rounded-full bg-copper" />
                    <span className="ledger-pulse-delay h-1.5 w-1.5 rounded-full bg-copper" />
                    <span className="ledger-pulse-delay-2 h-1.5 w-1.5 rounded-full bg-copper" />
                  </span>
                  <span className="label-tech">Reading the ledger</span>
                  <span className="text-[12px] text-ink-2">checking tools and context…</span>
                </li>
              )}
              <div ref={bottomRef} />
            </ul>
          </div>
        </ScrollArea>

        <form
          className="border-t border-rule bg-surface-2/20 p-2 md:p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-[var(--radius-card)] border border-rule bg-card p-1.5 shadow-[0_1px_0_rgba(23,25,24,0.03)] focus-within:border-copper/35 focus-within:ring-2 focus-within:ring-copper/10">
            <label htmlFor="chat-input" className="sr-only">
              Expense or question
            </label>
            <textarea
              id="chat-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              placeholder="What happened to your money?"
              className="max-h-36 min-h-[44px] flex-1 resize-none bg-transparent px-2.5 py-2.5 text-[14px] text-ink placeholder:text-ink-2/80 focus:outline-none"
            />
            <div className="flex shrink-0 items-center gap-1.5 pb-1 pr-1">
              <kbd aria-hidden="true" className="hidden sm:inline-flex">
                Enter
              </kbd>
              <Button
                type="submit"
                disabled={busy || draft.trim().length === 0}
                size="icon"
                className="h-9 w-9 rounded-[var(--radius-button)]"
                aria-label="Send message"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="mx-auto mt-2 max-w-3xl px-1 font-mono text-[10px] uppercase tracking-wide text-ink-2">
            Draft first · confirm to settle · numbers from ledger tools
          </p>
        </form>
      </div>

      <TraceDrawer
        open={traceOpen}
        onOpenChange={setTraceOpen}
        tools={latestTrace}
        contextDay={contextDay}
      />
    </section>
  );
}
