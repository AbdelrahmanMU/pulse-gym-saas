import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Conditional + conflict-resolving className join (the shadcn `cn` convention).
 * `clsx` flattens conditionals; `tailwind-merge` deduplicates conflicting Tailwind
 * utilities so the last one wins. PULSE components and primitives compose classes
 * through this — never by string concatenation.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
