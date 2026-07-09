import Link from "next/link";
import { UserPlus } from "lucide-react";
import { requireSession } from "@/lib/auth/guard";
import { PageContainer } from "@/components/pulse/page-container";
import { PageHeader } from "@/components/pulse/page-header";
import {
  LoadingState,
  SkeletonForm,
  SkeletonKpiGrid,
  SkeletonTable,
} from "@/components/pulse/loading-state";
import { EmptyState } from "@/components/pulse/empty-state";
import { ErrorState } from "@/components/pulse/error-state";
import { Button } from "@/components/pulse/button";

/**
 * UI-states demonstration surface (refinement R-6). Renders working examples of the five
 * mandated states with placeholder data: **Loading · Empty · Error · Unauthorized ·
 * Forbidden**. Unauthorized and Forbidden also have real runtime behavior elsewhere
 * (unauthenticated access → redirect to `/sign-in` via the `(app)` layout; a missing
 * permission → the inline Forbidden `ErrorState` on `/dashboard`); here they are shown as
 * their visual treatments. Structural/illustrative only — no business behavior (R-2).
 */
function StateBlock({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <p className="eyebrow">{eyebrow}</p>
      {children}
    </section>
  );
}

export default async function UiStatesPage({
  searchParams,
}: {
  searchParams: Promise<{ throw?: string }>;
}) {
  await requireSession();

  // `?throw=1` forces an unexpected error to exercise the (app) error boundary
  // (T-17 runtime verification): the throw propagates to `error.tsx`, which renders the
  // Catalog `ErrorState`, and `instrumentation.ts` logs the context once server-side.
  const params = await searchParams;
  if (params.throw) {
    throw new Error("Forced error for error-boundary verification");
  }

  return (
    <PageContainer>
      <PageHeader
        title="UI states"
        subtitle="Catalog state components rendered with placeholder data (Loading, Empty, Error, Unauthorized, Forbidden)."
        actions={
          <Button asChild variant="secondary">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-10">
        <StateBlock eyebrow="Loading">
          <div className="grid gap-4 md:grid-cols-2">
            <LoadingState variant="skeleton" />
            <LoadingState variant="spinner" label="Loading members…" />
          </div>
        </StateBlock>

        <StateBlock eyebrow="Loading — skeleton variants (Catalog §10)">
          <div className="flex flex-col gap-4">
            <SkeletonKpiGrid count={3} />
            <div className="grid gap-4 md:grid-cols-2">
              <SkeletonTable rows={3} />
              <SkeletonForm fields={2} />
            </div>
          </div>
        </StateBlock>

        <StateBlock eyebrow="Empty">
          <EmptyState
            title="No members yet"
            description="When you add your first member they'll appear here."
            icon={<UserPlus aria-hidden />}
            action={<Button>Add member</Button>}
          />
        </StateBlock>

        <StateBlock eyebrow="Error">
          <ErrorState
            title="Couldn't load this section"
            description="A network error interrupted the request. If it keeps happening, contact support with reference 4f3c-demo."
            action={
              <Button asChild>
                <Link href="/ui-states">Try again</Link>
              </Button>
            }
          />
        </StateBlock>

        <StateBlock eyebrow="Unauthorized (401)">
          <ErrorState
            variant="inline"
            title="Session expired"
            description="Your session has ended. Sign in again to continue. (At runtime, unauthenticated access redirects to sign-in before a page renders.)"
            action={
              <Button asChild variant="secondary">
                <Link href="/sign-in">Sign in</Link>
              </Button>
            }
          />
        </StateBlock>

        <StateBlock eyebrow="Forbidden (403)">
          <ErrorState
            variant="inline"
            title="Access denied"
            description="You don't have permission to view this resource. (At runtime, a missing permission renders this inline on the gated route — never a role check.)"
            action={
              <Button asChild variant="secondary">
                <Link href="/dashboard">Back to dashboard</Link>
              </Button>
            }
          />
        </StateBlock>
      </div>
    </PageContainer>
  );
}
