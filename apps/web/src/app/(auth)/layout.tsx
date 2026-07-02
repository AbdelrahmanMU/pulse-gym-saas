import type { ReactNode } from "react";

/**
 * Public auth-segment layout (Sprint 1.6) — the unauthenticated counterpart of the
 * `(app)` shell: a token-only brand header (the volt block is decorative; the wordmark
 * is neutral text — brand is never readable text, Design System §2) above a centered
 * single-column area sized for auth cards. No session logic lives here — protection
 * stays in the `(app)` segment (`requireSession`).
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-(--topbar-h) shrink-0 items-center gap-2 px-4 md:px-8">
        <span aria-hidden className="size-6 rounded-sm bg-primary" />
        <span className="font-display text-h3 font-semibold text-foreground">PULSE</span>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
