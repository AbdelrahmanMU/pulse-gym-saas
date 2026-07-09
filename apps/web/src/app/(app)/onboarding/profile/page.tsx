import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/pulse/page-container";
import { PageHeader } from "@/components/pulse/page-header";
import { loadMyProfile } from "@/modules/gym/queries";
import { ProfileForm } from "@/modules/gym/ui/profile-form";

/** Onboarding step 3 — Owner Profile (Sprint-1 Epic-1). Advances to the completion step. */
export default async function OnboardingProfilePage() {
  const t = await getTranslations("settings");
  const profile = await loadMyProfile();
  return (
    <PageContainer width="narrow">
      <PageHeader title={t("onboardingTitle")} subtitle={t("onboardingProfileStep")} />
      <ProfileForm initial={profile} nextHref="/onboarding/complete" />
    </PageContainer>
  );
}
