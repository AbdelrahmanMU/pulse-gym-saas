import type { ReactNode } from "react";
import { Space_Grotesk, Inter, JetBrains_Mono, Noto_Sans_Arabic } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { dirForLocale, type Locale } from "@/i18n/locale";

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

/**
 * Arabic UI face (Sprint 2.x localization). The three Latin families above carry no
 * Arabic glyphs, so under `dir="rtl"` Arabic would fall back to a random system font —
 * fatal to the Authority's "reads as originally-written Arabic" quality bar. This var
 * is appended to the `body`/`h*` font stacks (tokens `globals.css`) so the browser does
 * per-glyph fallback: Latin/digits stay in Inter/JetBrains Mono, Arabic renders here.
 *
 * PROVISIONAL (Authority · ruling R7 — final Arabic font is a human-gated design-token
 * decision). Noto Sans Arabic is the placeholder; flagged in the implementation report.
 */
const fontArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600"],
  variable: "--font-arabic",
  display: "swap",
});

const FONT_VARS = [
  fontDisplay.variable,
  fontSans.variable,
  fontMono.variable,
  fontArabic.variable,
].join(" ");

export async function generateMetadata() {
  const t = await getTranslations("meta");
  // "PULSE" is the brand and never localizes; the description does.
  return { title: "PULSE", description: t("description") };
}

// `viewport-fit=cover` lets bottom-anchored v1.2 patterns (FAB, sticky action bar, bottom
// sheet) extend under device notches/home indicators and pad by the `--safe-*` tokens (§5.8).
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  // Phase 2: `dir` now follows the locale (Arabic → rtl). The shared catalog components
  // are migrated to logical CSS (ms/me/ps/pe/start/end/text-start), so the shell renders
  // correctly RTL; per-module physical classes are finished in each Phase-3 module pass.
  return (
    <html lang={locale} dir={dirForLocale(locale as Locale)} className={FONT_VARS}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
