import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-button border text-[13px] font-medium transition-[background-color,border-color,color,opacity,box-shadow,transform] duration-[var(--dur-base)] ease-[var(--ease-instrument)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:pointer-events-none disabled:opacity-45 active:scale-[0.985] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-ink bg-ink text-paper hover:opacity-92",
        secondary:
          "border-rule bg-card text-ink hover:border-[color-mix(in_srgb,var(--ink-2)_35%,var(--rule))] hover:bg-surface-2/50",
        ghost:
          "border-transparent bg-transparent text-ink-2 hover:bg-surface-2/60 hover:text-ink",
        copper:
          "border-copper/40 bg-copper/12 text-ink hover:bg-copper/18",
        danger:
          "border-over/35 bg-over/10 text-over hover:bg-over/14",
      },
      size: {
        default: "h-9 px-3.5 py-2",
        sm: "h-8 px-2.5 text-[12px]",
        lg: "h-10 px-4",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
