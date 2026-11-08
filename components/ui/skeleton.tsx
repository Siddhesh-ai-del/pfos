import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-[var(--radius-chip)] bg-surface-2/70", className)} {...props} />;
}

export { Skeleton };
