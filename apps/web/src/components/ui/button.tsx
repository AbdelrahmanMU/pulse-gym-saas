import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * shadcn-idiom Button **primitive**, restyled entirely to PULSE tokens (Design System
 * v1.1; Catalog stack primitive). This is the *internal* primitive layer — only PULSE
 * components (`components/pulse/**`) compose it; application/route code never imports it
 * directly (refinement R-1). Focus is intentionally NOT styled here: the global base
 * layer owns the solid 2px ring + offset (globals.css §4) so it is identical everywhere.
 *
 * Token-purity notes: heights map to the 4px spacing scale (`h-11` = `--control-h`
 * 2.75rem, `h-9` = `--control-h-sm`, `h-13` = `--control-h-lg`); the disabled opacity
 * uses the v4 custom-property shorthand `opacity-(--opacity-disabled)`. No literals.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-body font-semibold transition-colors ease-standard disabled:pointer-events-none disabled:opacity-(--opacity-disabled) [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        secondary: "border border-border bg-surface-raised text-foreground hover:bg-surface",
        outline:
          "border border-border-strong bg-transparent text-foreground hover:bg-surface-raised",
        ghost: "bg-transparent text-foreground hover:bg-surface-raised",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-11 px-4",
        lg: "h-13 px-6",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /** Render as the child element (Radix Slot) — e.g. an anchor styled as a button. */
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : (type ?? "button")}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
