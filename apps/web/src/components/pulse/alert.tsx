import { type ReactNode } from "react";
import { CheckCircle2, Info, TriangleAlert, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * PULSE Alert (Catalog §10) — inline, in-context message (info/success/warning/danger).
 * Severity is carried by an icon **and** text, never colour alone (`*-tint` background +
 * `*-text` accessible foreground). Urgent severities announce via `role="alert"`; the
 * rest use `role="status"`. Used here as the form-result surface (validation summary /
 * save confirmation). Tokens only.
 */
export type AlertSeverity = "info" | "success" | "warning" | "danger";

const SEVERITY = {
  info: { Icon: Info, tint: "bg-info-tint", text: "text-info-text" },
  success: { Icon: CheckCircle2, tint: "bg-success-tint", text: "text-success-text" },
  warning: { Icon: TriangleAlert, tint: "bg-warning-tint", text: "text-warning-text" },
  danger: { Icon: XCircle, tint: "bg-danger-tint", text: "text-danger-text" },
} as const;

export interface AlertProps {
  severity: AlertSeverity;
  title?: string;
  children?: ReactNode;
  className?: string;
}

export function Alert({ severity, title, children, className }: AlertProps) {
  const { Icon, tint, text } = SEVERITY[severity];
  return (
    <div
      role={severity === "danger" || severity === "warning" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-md p-4", tint, className)}
    >
      <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", text)} />
      <div className="flex flex-col gap-0.5">
        {title ? <p className={cn("text-body font-semibold", text)}>{title}</p> : null}
        {children ? <div className="text-body-sm text-foreground">{children}</div> : null}
      </div>
    </div>
  );
}
