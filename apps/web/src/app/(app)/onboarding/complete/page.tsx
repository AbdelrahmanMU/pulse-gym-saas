import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("settings");
  return (
    <PageContainer width="narrow">
      <SuccessState
        title={t("onboardingCompleteTitle")}
        summary={t("onboardingCompleteSummary")}
        actions={
          <form action={finishOnboardingAction}>
            <Button type="submit">
              {t("goToDashboard")}
              <ArrowRight aria-hidden />
            </Button>
          </form>
        }
      />
    </PageContainer>
  );
}
