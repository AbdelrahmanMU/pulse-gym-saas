import { PageContainer } from "@/components/pulse/page-container";
import { PageHeader } from "@/components/pulse/page-header";
import { loadGymSettings } from "@/modules/gym/queries";
import { currencyOptions, timeZoneOptions } from "@/modules/gym/options";
import { GymSettingsForm } from "@/modules/gym/ui/gym-settings-form";

/**
 * Onboarding step 1 — Gym Setup (Sprint-1 Epic-1). The guided first-run flow:
 * Gym → Branch → Owner Profile → Success → Dashboard. Reuses the same gym form and
 * server action as the settings page; on success it advances to the branch step.
 */
export default async function OnboardingGymPage() {
  const settings = await loadGymSettings();
  return (
    <PageContainer width="narrow">
      <PageHeader title="Set up your gym" subtitle="Step 1 of 3 · Gym details" />
      <GymSettingsForm
        initial={settings}
        currencyOptions={currencyOptions()}
        timeZoneOptions={timeZoneOptions()}
        nextHref="/onboarding/branch"
      />
    </PageContainer>
  );
}
