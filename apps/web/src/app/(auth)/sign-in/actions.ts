"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { attemptSignIn } from "@/lib/auth/sign-in";
import { log } from "@/lib/logger";

export interface SignInState {
  readonly error: string | null;
}

/**
 * Sign-in server action (T-19). Validates nothing beyond presence here — the
 * Credentials `authorize` callback does the Zod boundary validation and credential
 * verification. On failure returns a **generic** message (no user-enumeration hint);
 * on success redirects into the protected segment. Never imports `next-auth`.
 */
export async function signInAction(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const ok = await attemptSignIn(email, password);
  if (!ok) {
    log.warn("auth.signin.invalid", { code: "AUTH", module: "auth" });
    const t = await getTranslations("auth");
    return { error: t("invalidCredentials") };
  }

  redirect("/dashboard");
}
