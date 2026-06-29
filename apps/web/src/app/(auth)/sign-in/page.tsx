import { SignInForm } from "./sign-in-form";

/**
 * Public sign-in route (T-07 `(auth)` group). No session required. The authenticated
 * `(app)` segment redirects here when unauthenticated.
 */
export default function SignInPage() {
  return (
    <main>
      <h1>Sign in to PULSE</h1>
      <SignInForm />
    </main>
  );
}
