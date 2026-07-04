import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SignInForm } from "./sign-in-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: `${t("title")} · PULSE` };
}

/**
 * Public sign-in route (T-07 `(auth)` group), recomposed from the PULSE catalog in
 * Sprint 1.6. No session required; the authenticated `(app)` segment redirects here
 * when unauthenticated. The auth flow itself is unchanged (see ./actions.ts).
 */
export default async function SignInPage() {
  const t = await getTranslations("auth");
  return (
    <div className="flex flex-col gap-6 rounded-md border border-border bg-surface p-6 shadow-md md:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-h1 text-foreground">{t("title")}</h1>
        <p className="text-body text-muted-foreground">{t("subtitle")}</p>
      </div>
      <SignInForm />
    </div>
  );
}
