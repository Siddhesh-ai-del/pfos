import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-chip border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em]",
  {
    variants: {
      variant: {
        default: "border-rule bg-surface-2/40 text-ink-2",
        copper: "border-copper/30 bg-copper/10 text-copper-fg",
        confirmed: "border-confirmed/25 bg-confirmed/10 text-confirmed-fg",
        estimate: "border-estimate/30 bg-estimate/10 text-estimate-fg",
        over: "border-over/25 bg-over/10 text-over-fg",
        outline: "border-rule bg-transparent text-ink-2",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
