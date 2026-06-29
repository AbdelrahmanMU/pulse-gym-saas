import type { ReactNode } from "react";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";

// Importing the env module at the root of the server tree validates the
// environment on first render and **refuses to boot** on misconfiguration (T-15).
import "@/env";
// PULSE token pipeline: Tailwind v4 + the @pulse/design-tokens implementation (T-14).
import "./globals.css";

/**
 * Three font families, one job each (Design System v1.1 §6), self-hosted via
 * `next/font` (no layout shift, `display: swap`, latin subset, weights-in-use only).
 * Each exposes the CSS variable `globals.css` already references in `@theme`/`body`/`h*`
 * — the layout only PROVIDES them; components never name a font directly.
 */
const fontDisplay = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-display",
  display: "swap",
});
const fontSans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});
const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata = {
  title: "PULSE",
  description: "PULSE Gym Membership Management",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${fontDisplay.variable} ${fontSans.variable} ${fontMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
