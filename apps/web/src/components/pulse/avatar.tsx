import { AvatarFallback, AvatarImage, AvatarRoot } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/**
 * PULSE Avatar (Catalog §11) — a person's representation with a **deterministic initials
 * fallback** and the `--avatar-*` size scale. Composes the Radix avatar primitive; the
 * application uses this, never the primitive (refinement R-1). Sizes map to the 4px
 * spacing scale (`size-8` = `--avatar-sm` 2rem, `size-10` = md 2.5rem, `size-16` = lg 4rem).
 */
type AvatarSize = "sm" | "md" | "lg";

const SIZE: Record<AvatarSize, string> = {
  sm: "size-8 text-caption",
  md: "size-10 text-body-sm",
  lg: "size-16 text-h3",
};

/** First letters of up to two name parts, uppercased — never empty for a real name. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

export interface AvatarProps {
  /** Person's name — the accessible label and the source of the initials fallback. */
  name: string;
  src?: string | undefined;
  size?: AvatarSize;
  className?: string;
}

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  return (
    <AvatarRoot className={cn(SIZE[size], "font-medium", className)}>
      {src ? <AvatarImage src={src} alt={name} /> : null}
      <AvatarFallback aria-label={name}>{initials(name)}</AvatarFallback>
    </AvatarRoot>
  );
}
