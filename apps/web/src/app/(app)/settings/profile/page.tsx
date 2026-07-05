import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/pulse/page-container";
import { PageHeader } from "@/components/pulse/page-header";
import { loadMyProfile } from "@/modules/gym/queries";
import { ProfileForm } from "@/modules/gym/ui/profile-form";

/**
 * Owner (self) profile page (Sprint-1 Epic-1). Self-ownership — no permission gate beyond
 * the authenticated session (OQ-2). The action edits the session user only. Email/password
 * are out of scope (Phase-2 auth).
 */
export default async function ProfileSettingsPage() {
  const t = await getTranslations("settings");
  const profile = await loadMyProfile();
  return (
    <PageContainer width="narrow">
      <PageHeader title={t("profileTitle")} subtitle={t("profileSubtitle")} />
      <ProfileForm initial={profile} />
    </PageContainer>
  );
}
