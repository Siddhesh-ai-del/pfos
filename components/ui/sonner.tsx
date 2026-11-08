"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster({ ...props }: ToasterProps) {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={(resolvedTheme as ToasterProps["theme"]) ?? "system"}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast border border-rule bg-card text-ink shadow-[0_12px_40px_rgba(23,25,24,0.12)] rounded-[var(--radius-card)] font-sans",
          description: "text-ink-2 text-[13px]",
          actionButton: "bg-ink text-paper rounded-[var(--radius-button)]",
          cancelButton: "bg-surface-2 text-ink rounded-[var(--radius-button)]",
        },
      }}
      {...props}
    />
  );
}
