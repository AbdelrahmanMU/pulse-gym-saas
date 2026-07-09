import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/pulse/loading-state";

/**
 * Root loading fallback — covers the public landing (`/`), which previously showed a
 * blank screen while its session check resolved. The brand header is static content
 * (no data), so it renders for real; only the hero is skeletoned (anti-flash: what can
 * be shown, is shown). The `(app)`/`(auth)` groups own their closer fallbacks.
 */
export default async function RootLoading() {
  const t = await getTranslations("common");
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-(--topbar-h) shrink-0 items-center gap-2 px-4 md:px-8">
        <span aria-hidden className="size-6 rounded-sm bg-primary" />
        <span className="font-display text-h3 font-semibold text-foreground">PULSE</span>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div
          role="status"
          aria-busy="true"
          aria-label={t("loading")}
          className="flex w-full max-w-(--breakpoint-md) flex-col items-center gap-6"
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-11 w-40" />
        </div>
      </main>
    </div>
  );
}
