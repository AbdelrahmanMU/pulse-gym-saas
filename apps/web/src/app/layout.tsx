import type { ReactNode } from "react";

// Importing the env module at the root of the server tree validates the
// environment on first render and **refuses to boot** on misconfiguration (T-15).
// The design system, tokens, and app shell arrive in Session 4 (T-12…T-14, T-08);
// this is a deliberately bare skeleton.
import "@/env";

export const metadata = {
  title: "PULSE",
  description: "PULSE Gym Membership Management",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
