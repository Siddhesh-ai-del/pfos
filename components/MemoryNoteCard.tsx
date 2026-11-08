import { BookMarked, Fingerprint, Copy } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BookMarked className="h-3.5 w-3.5 text-copper-fg" aria-hidden="true" />
          <Badge variant={isCommitment ? "confirmed" : "estimate"}>
            {card.memoryType} · open
          </Badge>
          <span className="label-tech">Memory</span>
        </div>
        <Popover>
          <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Memory audit"><Fingerprint className="h-3.5 w-3.5" /></Button></PopoverTrigger>
          <PopoverContent align="end" className="w-64"><p className="label-tech mb-1 text-copper-fg">Memory record</p><p className="font-mono text-[11px] text-ink-2 break-all">{card.id}</p><DropdownMenu><DropdownMenuTrigger asChild><Button variant="secondary" size="sm" className="mt-2"><Copy className="mr-1 h-3.5 w-3.5" />Copy ID</Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onSelect={() => { void navigator.clipboard?.writeText(card.id); toast.success("Memory ID copied"); }}>Copy ID</DropdownMenuItem></DropdownMenuContent></DropdownMenu></PopoverContent>
        </Popover>
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
