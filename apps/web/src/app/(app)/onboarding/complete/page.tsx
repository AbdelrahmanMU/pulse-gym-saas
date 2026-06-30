import { ArrowRight } from "lucide-react";
import { PageContainer } from "@/components/pulse/page-container";
import { SuccessState } from "@/components/pulse/success-state";
import { Button } from "@/components/pulse/button";
import { finishOnboardingAction } from "@/modules/gym/actions";

/**
 * Onboarding completion state (Sprint-1 Epic-1) — confirms the gym is ready before the
 * dashboard. "Go to dashboard" submits {@link finishOnboardingAction}, which marks setup
 * complete (`gym.setupCompletedAt`) and redirects, so the gym is no longer routed into
 * onboarding on future logins.
 */
export default function OnboardingCompletePage() {
  return (
    <PageContainer width="narrow">
      <SuccessState
        title="Your gym is ready"
        summary="Setup is complete. You can fine-tune any of these settings anytime from the Settings menu."
        actions={
          <form action={finishOnboardingAction}>
            <Button type="submit">
              Go to dashboard
              <ArrowRight aria-hidden />
            </Button>
          </form>
        }
      />
    </PageContainer>
  );
}
