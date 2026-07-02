import type { Metadata } from "next";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in · PULSE" };

/**
 * Public sign-in route (T-07 `(auth)` group), recomposed from the PULSE catalog in
 * Sprint 1.6. No session required; the authenticated `(app)` segment redirects here
 * when unauthenticated. The auth flow itself is unchanged (see ./actions.ts).
 */
export default function SignInPage() {
  return (
    <div className="flex flex-col gap-6 rounded-md border border-border bg-surface p-6 shadow-md md:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-h1 text-foreground">Sign in</h1>
        <p className="text-body text-muted-foreground">
          Use your staff account to manage your gym.
        </p>
      </div>
      <SignInForm />
    </div>
  );
}
