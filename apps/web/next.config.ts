import { resolve } from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Load the monorepo-root `.env` (single source of truth, git-ignored) into
// `process.env` before the Zod env module (src/env.ts) validates it. Node 20.12+
// built-in — no `dotenv` dependency (Sprint 0 §4 dep discipline). Missing file is
// tolerated so CI/hosts that inject real env vars boot without a file present.
try {
  process.loadEnvFile(resolve(import.meta.dirname, "../../.env"));
} catch {
  // No root .env file — rely on the ambient environment (CI / production).
}

const nextConfig: NextConfig = {
  // Server Components default (ADR-003); strict React in dev.
  reactStrictMode: true,
  // Linting runs through the shared flat config via `turbo run lint` (T-21), not
  // Next's bundled ESLint — avoids a second, divergent eslint-config-next setup.
  eslint: { ignoreDuringBuilds: true },
};

// next-intl (Sprint 2.x localization): "without i18n routing" mode — the request
// config at `src/i18n/request.ts` resolves the locale + messages per request. No
// `/ar` `/en` path segments (Authority defers a v1 switcher).
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
