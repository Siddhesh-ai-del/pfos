// MemoryNoteCard (docs/design-direction.md §4.4): quiet confirmation that a
// decision/commitment was recorded — no stamp (it's non-money write; audit auto).

export type MemoryNoteCardVM = {
  kind: "memory_note";
  id: string;
  memoryType: "decision" | "commitment";
  text: string;
  sub: string | null;
};

export function MemoryNoteCard({ card }: { card: MemoryNoteCardVM }) {
  return (
    <div
      className="card--confirmed mt-2 w-full rounded-card p-3"
      role="group"
      aria-label={card.memoryType === "commitment" ? "Commitment recorded" : "Decision recorded"}
    >
      <span
        className={`font-mono text-[10px] uppercase tracking-widest ${
          card.memoryType === "commitment" ? "text-confirmed" : "text-estimate"
        }`}
      >
        {card.memoryType} · open
      </span>
      <p className="mt-1 text-[14px] leading-snug text-ink">{card.text}</p>
      {card.sub && (
        <p className="num mt-1 text-[11px] uppercase tracking-wide text-ink-2">
          {card.sub}
        </p>
      )}
    </div>
  );
}
