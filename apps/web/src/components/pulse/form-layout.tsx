"use client";

import { type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StickyMobileActionBar } from "./sticky-mobile-action-bar";

/**
 * PULSE FormLayout / FormSection / SubmitButton (Catalog §9). FormLayout owns the
 * `<form>`, the single-column constraint, section spacing, and the action row; it
 * prevents double-submit via the pending state. FormSection groups related fields under
 * a `<fieldset>/<legend>` (accessible grouping). SubmitButton reflects the form's pending
 * state (`useFormStatus`) so the control is disabled and labelled while the Server Action
 * runs. The `wizard` variant is used by the onboarding flow (per-step forms). Tokens only.
 */
export interface FormLayoutProps extends Omit<ComponentProps<"form">, "className"> {
  children: ReactNode;
  /** The action row (submit/cancel). Rendered below the sections. */
  actions?: ReactNode;
  variant?: "single-column" | "wizard";
  className?: string;
}

export function FormLayout({
  children,
  actions,
  variant = "single-column",
  className,
  ...formProps
}: FormLayoutProps) {
  return (
    <form className={cn("flex flex-col gap-8", className)} data-variant={variant} {...formProps}>
      <div className="flex flex-col gap-8">{children}</div>
      {/* Action row = StickyMobileActionBar (Catalog §12.3): inline ≥md exactly as before;
          pinned to the thumb zone <md so long forms never scroll-hunt for Submit (v1.2 §5.3). */}
      {actions ? <StickyMobileActionBar>{actions}</StickyMobileActionBar> : null}
    </form>
  );
}

export interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <fieldset className={cn("flex flex-col gap-4", className)}>
      <legend className="flex flex-col gap-1">
        <span className="text-h3 text-foreground">{title}</span>
        {description ? (
          <span className="text-body-sm text-muted-foreground">{description}</span>
        ) : null}
      </legend>
      <div className="flex flex-col gap-4">{children}</div>
    </fieldset>
  );
}

export interface SubmitButtonProps extends Omit<ComponentProps<typeof Button>, "type"> {
  children: ReactNode;
  /** Label shown while the action is pending (defaults to children). */
  pendingLabel?: ReactNode;
}

export function SubmitButton({ children, pendingLabel, disabled, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={disabled ?? pending} aria-busy={pending} {...props}>
      {pending ? (pendingLabel ?? children) : children}
    </Button>
  );
}
