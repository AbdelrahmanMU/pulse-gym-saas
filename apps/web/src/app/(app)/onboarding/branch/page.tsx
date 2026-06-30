import { PageContainer } from "@/components/pulse/page-container";
import { PageHeader } from "@/components/pulse/page-header";
import { loadDefaultBranch } from "@/modules/gym/queries";
import { BranchForm } from "@/modules/gym/ui/branch-form";

/** Onboarding step 2 — Branch Setup (Sprint-1 Epic-1). Advances to the profile step. */
export default async function OnboardingBranchPage() {
  const branch = await loadDefaultBranch();
  return (
    <PageContainer width="narrow">
      <PageHeader title="Set up your gym" subtitle="Step 2 of 3 · Your main branch" />
      <BranchForm initial={branch} nextHref="/onboarding/profile" />
    </PageContainer>
  );
}
