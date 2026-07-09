"use client";

import type { ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * PULSE ActionMenu (Catalog §2) — overflow / contextual menu of actions. Composes the
 * Radix dropdown primitive (refinement R-1); the application uses this, never the
 * primitive. Destructive items render with the accessible `danger-text` token and sit
 * below a separator. Radix supplies menu/menuitem ARIA, arrow-key roving, Esc-close, and
 * focus-return-to-trigger.
 */
export interface ActionMenuItem {
  label: string;
  /** Invoked on selection. Server actions are callable here. */
  onSelect?: () => void;
  icon?: ReactNode;
  variant?: "default" | "destructive";
  disabled?: boolean;
}

export interface ActionMenuProps {
  /** The trigger element (e.g. an icon button or the user identity button). */
  trigger: ReactNode;
  /** Optional non-interactive header (e.g. the signed-in user's name + email). */
  header?: ReactNode;
  items: readonly ActionMenuItem[];
  align?: "start" | "end";
}

export function ActionMenu({ trigger, header, items, align = "end" }: ActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {header ? (
          <>
            <DropdownMenuLabel>{header}</DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        ) : null}
        {items.map((item) => (
          <DropdownMenuItem
            key={item.label}
            disabled={item.disabled}
            onSelect={item.onSelect}
            className={cn(item.variant === "destructive" && "text-danger-text")}
          >
            {item.icon}
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
