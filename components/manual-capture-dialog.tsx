"use client";

import * as React from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export function ManualCaptureDialog({ open, onOpenChange, onCapture }: { open: boolean; onOpenChange: (v: boolean) => void; onCapture: (text: string) => void }) {
  const [text, setText] = React.useState("");
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto w-full max-w-2xl rounded-t-[14px]">
        <SheetHeader>
          <SheetTitle>Manual capture</SheetTitle>
          <SheetDescription>Structured fallback: write the capture as a plain sentence. PFOS will still draft it for confirmation.</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-3 pb-4">
          <label htmlFor="manual-capture" className="label-tech">Capture text</label>
          <textarea id="manual-capture" value={text} onChange={(e) => setText(e.target.value)} rows={3} className="w-full rounded-[var(--radius-input)] border border-rule bg-card px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. spent ₹120 on lunch at canteen" />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => { const t = text.trim(); if (!t) return toast.error("Add a capture first"); onCapture(t); setText(""); onOpenChange(false); }}>Send to ledger</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
