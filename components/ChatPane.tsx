// Chat pane (Slice 1 placeholder). Slice 2 wires POST /api/agent + draft cards.
export function ChatPane({ greeting }: { greeting: boolean; summary?: unknown }) {
  return (
    <section aria-label="Assistant" className="flex h-full flex-col">
      <div className="card--confirmed rounded-card p-4">
        <p className="text-[15px] leading-relaxed">
          {greeting && <>Ready. Type an expense like </>}
          {greeting && <em>&ldquo;spent ₹120 on lunch&rdquo;</em>}
          {greeting && <>.</>}
        </p>
        <p className="mt-2 text-[13px] text-ink-2">
          Everything you type becomes a structured record — nothing is saved
          until you confirm it.
        </p>
      </div>
      {/* Slice 2: message stream + draft cards land here */}
      <div
        className="mt-4 flex flex-1 items-center justify-center rounded-card border border-dashed border-rule p-4"
        aria-hidden="true"
      >
        <p className="font-mono text-[11px] uppercase tracking-wide text-ink-2">
          conversation begins in Slice 2
        </p>
      </div>
    </section>
  );
}
