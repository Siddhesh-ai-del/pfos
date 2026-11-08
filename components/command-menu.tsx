"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { PanelRightOpen, RotateCcw, Fingerprint, SunMoon, Keyboard, PenLine, Columns2 } from "lucide-react";

export function CommandMenu({
  onOpenInstruments,
  onOpenTrace,
  onOpenHelp,
  onOpenCapture,
  onToggleSplit,
  splitView,
}: {
  onOpenInstruments: () => void;
  onOpenTrace: () => void;
  onOpenHelp: () => void;
  onOpenCapture: () => void;
  onToggleSplit?: () => void;
  splitView?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const { setTheme, resolvedTheme } = useTheme();
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "?" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        onOpenHelp();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [onOpenHelp]);

  const run = (fn: () => void) => () => { setOpen(false); fn(); };

  async function resetDemo() {
    setOpen(false);
    const t = toast.loading("Resetting demo…");
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      if (!res.ok) throw new Error();
      router.refresh();
      toast.success("Demo reset to seed state", { id: t });
    } catch {
      toast.error("Reset failed", { id: t });
    }
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or action…" />
      <CommandList>
        <CommandEmpty>No matching action.</CommandEmpty>
        <CommandGroup heading="Ledger">
          <CommandItem onSelect={run(onOpenCapture)}><PenLine className="mr-2 h-4 w-4" />Manual capture<CommandShortcut>C</CommandShortcut></CommandItem>
          <CommandItem onSelect={run(onOpenInstruments)}><PanelRightOpen className="mr-2 h-4 w-4" />Open instruments<CommandShortcut>I</CommandShortcut></CommandItem>
          {onToggleSplit ? <CommandItem onSelect={run(onToggleSplit)}><Columns2 className="mr-2 h-4 w-4" />{splitView ? "Unpin instruments" : "Pin instruments (split)"}<CommandShortcut>S</CommandShortcut></CommandItem> : null}
          <CommandItem onSelect={run(onOpenTrace)}><Fingerprint className="mr-2 h-4 w-4" />Open trace<CommandShortcut>T</CommandShortcut></CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="System">
          <CommandItem onSelect={run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))}><SunMoon className="mr-2 h-4 w-4" />Toggle theme</CommandItem>
          <CommandItem onSelect={resetDemo}><RotateCcw className="mr-2 h-4 w-4" />Reset demo</CommandItem>
          <CommandItem onSelect={run(onOpenHelp)}><Keyboard className="mr-2 h-4 w-4" />Keyboard shortcuts<CommandShortcut>?</CommandShortcut></CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
