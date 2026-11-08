import { BookMarked } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type MemoryNoteCardVM = {
  kind: "memory_note";
  id: string;
  memoryType: "decision" | "commitment";
  text: string;
  sub: string | null;
};

export function MemoryNoteCard({ card }: { card: MemoryNoteCardVM }) {
  const isCommitment = card.memoryType === "commitment";
  return (
    <div
      className="mt-3 w-full rounded-[var(--radius-card)] border border-rule bg-surface-2/15 p-3.5 trace-copper"
      role="group"
      aria-label={isCommitment ? "Commitment recorded" : "Decision recorded"}
    >
      <div className="flex flex-wrap items-center gap-2">
        <BookMarked className="h-3.5 w-3.5 text-copper" aria-hidden="true" />
        <Badge variant={isCommitment ? "confirmed" : "estimate"}>
          {card.memoryType} · open
        </Badge>
        <span className="label-tech">Memory</span>
      </div>
      <p className="mt-2.5 text-[14px] leading-relaxed text-ink">{card.text}</p>
      {card.sub && (
        <p className="num mt-2 border-t border-rule pt-2 font-mono text-[11px] uppercase tracking-wide text-ink-2">
          {card.sub}
        </p>
      )}
    </div>
  );
}
