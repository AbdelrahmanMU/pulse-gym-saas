import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/pulse/page-container";
import { PageHeader } from "@/components/pulse/page-header";
import { loadDefaultBranch } from "@/modules/gym/queries";
import { BranchForm } from "@/modules/gym/ui/branch-form";

/** Onboarding step 2 — Branch Setup (Sprint-1 Epic-1). Advances to the profile step. */
export default async function OnboardingBranchPage() {
  const t = await getTranslations("settings");
  const branch = await loadDefaultBranch();
  return (
    <PageContainer width="narrow">
      <PageHeader title={t("onboardingTitle")} subtitle={t("onboardingBranchStep")} />
      <BranchForm initial={branch} nextHref="/onboarding/profile" />
    </PageContainer>
  );
}
