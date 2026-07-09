import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/pulse/page-container";
import { SkeletonForm, SkeletonPageHeader } from "@/components/pulse/loading-state";

/** Form-shaped loading fallback (narrow container, matching the edit form). */
export default async function EditPlanLoading() {
  const t = await getTranslations("common");
  return (
    <PageContainer width="narrow">
      <div role="status" aria-busy="true" aria-label={t("loading")} className="flex flex-col gap-8">
        <SkeletonPageHeader />
        <SkeletonForm />
      </div>
    </PageContainer>
  );
}
