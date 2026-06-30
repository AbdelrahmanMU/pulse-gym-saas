import Link from "next/link";
import { PERMISSION_KEYS } from "@pulse/auth";
import { requirePermission } from "@/lib/auth/guard";
import { AuthorizationError } from "@/lib/errors";
import { PageContainer } from "@/components/pulse/page-container";
import { PageHeader } from "@/components/pulse/page-header";
import { ErrorState } from "@/components/pulse/error-state";
import { Button } from "@/components/pulse/button";
import { loadGymSettings } from "@/modules/gym/queries";
import { currencyOptions, timeZoneOptions } from "@/modules/gym/options";
import { GymSettingsForm } from "@/modules/gym/ui/gym-settings-form";

/**
 * Gym settings page (Sprint-1 Epic-1). View gated by `gym.view`, save by `gym.manage`
 * (decided in the Epic spec §5). A principal lacking access sees the inline Forbidden
 * `ErrorState` (the Session-4 pattern). Routing only — data + mutation live in the gym
 * module (constitution §2).
 */
export default async function GymSettingsPage() {
  try {
    await requirePermission(PERMISSION_KEYS.GYM_VIEW);
  } catch (error) {
    if (error instanceof AuthorizationError) return <Forbidden />;
    throw error;
  }

  const settings = await loadGymSettings();
  return (
    <PageContainer width="narrow">
      <PageHeader title="Gym settings" subtitle="Your gym's identity, currency, and time zone." />
      <GymSettingsForm
        initial={settings}
        currencyOptions={currencyOptions()}
        timeZoneOptions={timeZoneOptions()}
      />
    </PageContainer>
  );
}

function Forbidden() {
  return (
    <PageContainer width="narrow">
      <ErrorState
        variant="inline"
        title="Access denied"
        description="You don't have permission to manage gym settings. Contact your gym owner."
        action={
          <Button asChild variant="secondary">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        }
      />
    </PageContainer>
  );
}
