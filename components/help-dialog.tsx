"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

const shortcuts = [
  ["⌘/Ctrl + K", "Open command menu"],
  ["Enter", "Send message"],
  ["Shift + Enter", "New line in composer"],
  ["Esc", "Close drawer/dialog"],
  ["?", "Open this help"],
];

export function HelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(92vw,420px)]">
        <SheetHeader>
          <SheetTitle>Keyboard & flow</SheetTitle>
          <SheetDescription>PFOS is designed for fast, honest capture.</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="surface-inset p-3">
            <p className="label-tech mb-2">Shortcuts</p>
            <ul className="space-y-2">
              {shortcuts.map(([k, v]) => (
                <li key={k} className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="text-ink-2">{v}</span>
                  <kbd>{k}</kbd>
                </li>
              ))}
            </ul>
          </div>
          <Separator />
          <div className="text-[13px] leading-relaxed text-ink-2">
            <p className="label-tech mb-1">Ledger rules</p>
            <p>Drafts are estimates until you confirm. Money figures come from ledger tools/RPC results, not the assistant’s math.</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
