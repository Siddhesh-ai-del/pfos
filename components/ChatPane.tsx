"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DraftExpenseCard,
  type TransactionCardVM,
} from "@/components/DraftExpenseCard";

// Chat pane (Slice 2): real conversation through POST /api/agent.
// Draft action cards land in Slice 3; read-only context replies show a
// collapsed "Tool" chip (plan §3 Slice 2 UI).

type ChatRow =
  | {
      kind: "msg";
      role: "user" | "assistant";
      text: string;
      tools?: string[];
      cards?: TransactionCardVM[];
    }
  | { kind: "error"; text: string };

const GREETING: ChatRow = {
  kind: "msg",
  role: "assistant",
  text: 'Ready. Type an expense like "spent ₹120 on lunch".',
};

function toolLabel(name: string): string {
  const short = name.replace(/^pfos_(ledger|meal|memory)_/, "");
  return `Tool · ${short}`;
}

export function ChatPane() {
  const router = useRouter();
  const [rows, setRows] = useState<ChatRow[]>([GREETING]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<
    Array<{ role: "user" | "assistant"; text: string }>
  >([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [rows, busy]);

  async function send() {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    setDraft("");
    setRows((r) => [
      ...r,
      { kind: "msg", role: "user", text },
    ]);

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
      const cards = (body.cards ?? []).filter((c): c is TransactionCardVM => {
        if (typeof c !== "object" || c === null) return false;
        const kind = (c as { kind?: unknown }).kind;
        return typeof kind === "string" && kind.startsWith("transaction_");
      });
      setHistory([
        ...outgoingHistory,
        { role: "assistant" as const, text: reply },
      ]);
      setRows((r) => [
        ...r,
        {
          kind: "msg",
          role: "assistant",
          text: reply,
          tools: body.toolTrace?.length ? body.toolTrace : undefined,
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
    setRows((r) =>
      r.map((row) =>
        row.kind === "msg" && row.cards
          ? {
              ...row,
              cards: row.cards.map((c) =>
                c.id === id ? { ...c, status: "confirmed" as const } : c
              ),
            }
          : row
      )
    );
    router.refresh();
  }

  return (
    <section aria-label="Assistant" className="flex h-full flex-col">
      <div
        className="card--confirmed flex-1 overflow-y-auto rounded-card p-4"
        role="log"
        aria-live="polite"
        aria-label="Conversation"
      >
        <ul className="flex flex-col gap-3">
          {rows.map((row, i) => (
            <li key={i}>
              {row.kind === "msg" ? (
                <div
                  className={
                    row.role === "user" ? "flex justify-end" : "flex justify-start"
                  }
                >
                  <div
                    className={
                      row.role === "user"
                        ? "max-w-[80%] rounded-card bg-ink px-3 py-2 text-[14px] leading-relaxed text-paper"
                        : "max-w-[85%] rounded-card border border-rule bg-card px-3 py-2 text-[14px] leading-relaxed text-ink"
                    }
                  >
                    {row.text}
                    {row.cards?.map((card) => (
                      <DraftExpenseCard
                        key={card.id}
                        card={card}
                        onConfirmed={handleConfirmed}
                      />
                    ))}
                    {row.tools && row.tools.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {row.tools.map((t) => (
                          <span
                            key={t}
                            className="rounded-chip border border-rule px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ink-2"
                            title={`Executed whitelisted RPC-backed tool: ${t}`}
                          >
                            ≡ {toolLabel(t)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="rounded-card border border-dashed border-over px-3 py-2 text-[13px] text-over">
                  {row.text}
                </p>
              )}
            </li>
          ))}
          {busy && (
            <li className="font-mono text-[11px] uppercase tracking-wide text-ink-2">
              reading the ledger…
            </li>
          )}
          <div ref={bottomRef} />
        </ul>
      </div>

      <form
        className="card--confirmed mt-3 flex items-end gap-2 rounded-card p-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
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
          className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2 text-[14px] text-ink placeholder:text-ink-2 focus:outline-none"
        />
        <kbd aria-hidden="true" className="mb-2 shrink-0">
          Enter ↵
        </kbd>
        <button
          type="submit"
          disabled={busy || draft.trim().length === 0}
          className="stamp-settle mb-1 shrink-0 rounded-button border border-ink bg-ink px-3 py-2 text-[13px] font-medium text-paper disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </section>
  );
}
