import { PageContainer } from "@/components/pulse/page-container";
import { PageHeader } from "@/components/pulse/page-header";
import { loadMyProfile } from "@/modules/gym/queries";
import { ProfileForm } from "@/modules/gym/ui/profile-form";

/** Onboarding step 3 — Owner Profile (Sprint-1 Epic-1). Advances to the completion step. */
export default async function OnboardingProfilePage() {
  const profile = await loadMyProfile();
  return (
    <PageContainer width="narrow">
      <PageHeader title="Set up your gym" subtitle="Step 3 of 3 · Your profile" />
      <ProfileForm initial={profile} nextHref="/onboarding/complete" />
    </PageContainer>
  );
}
