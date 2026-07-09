import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * PULSE PageContainer (Catalog §1) — the standard content wrapper: max-width, gutters,
 * vertical rhythm. Padding uses the gutter tokens via the 4px scale (`px-4` = mobile
 * 1rem, `md:px-8` = desktop 2rem); width caps reference the layout tokens. Used on every
 * page; never nested.
 */
type Width = "default" | "wide" | "narrow";

const WIDTH: Record<Width, string> = {
  default: "max-w-(--content-max)", // 80rem (1280px)
  wide: "max-w-full",
  narrow: "max-w-(--breakpoint-sm)", // ~40rem (640px) — forms
};

export interface PageContainerProps {
  width?: Width;
  children: ReactNode;
  className?: string;
}

export function PageContainer({ width = "default", children, className }: PageContainerProps) {
  return (
    <div className={cn("mx-auto w-full px-4 py-8 md:px-8", WIDTH[width], className)}>
      {children}
    </div>
  );
}
