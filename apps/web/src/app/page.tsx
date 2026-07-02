import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/pulse/button";
import { currentUser } from "@/lib/auth/current-user";

/**
 * Public landing (Sprint 1.6) — replaces the T-06 placeholder. Signed-in staff go
 * straight to their dashboard (the session read reuses the platform `ICurrentUser`;
 * no auth logic is added or changed); everyone else gets the branded entry with the
 * single Sign-in action. Tokens/catalog only; the volt block is decorative and the
 * wordmark is neutral text (brand is never readable text, Design System §2).
 */
export default async function HomePage() {
  const principal = await currentUser.get();
  if (principal) redirect("/dashboard");

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-(--topbar-h) shrink-0 items-center gap-2 px-4 md:px-8">
        <span aria-hidden className="size-6 rounded-sm bg-primary" />
        <span className="font-display text-h3 font-semibold text-foreground">PULSE</span>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="flex w-full max-w-(--breakpoint-md) flex-col items-center gap-6 text-center">
          <p className="eyebrow">Gym membership management</p>
          <h1 className="text-display-lg text-foreground md:text-display-xl">
            The operational pulse of your gym.
          </h1>
          <p className="max-w-md text-body-lg text-muted-foreground">
            Members, plans, memberships, and payments — the daily work of running a gym, in one
            place for your whole team.
          </p>
          <Button asChild size="lg">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
