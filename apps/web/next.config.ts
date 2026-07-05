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
  // Self-contained server bundle for container/VM deploys (`node server.js`). Gated behind
  // BUILD_STANDALONE=1 because the file-tracing step creates symlinks, which fail on Windows
  // dev machines (EPERM) — so local `pnpm build` stays normal and only the Linux container
  // build (Dockerfile sets the flag) emits standalone. In a pnpm monorepo the trace root MUST
  // be the repo root, or workspace packages (@pulse/db, @pulse/auth) are omitted → runtime
  // 500s. Harmless on platforms that ignore it. See docs/deployment/deployment-runbook.md.
  ...(process.env.BUILD_STANDALONE === "1"
    ? {
        output: "standalone" as const,
        outputFileTracingRoot: resolve(import.meta.dirname, "../.."),
      }
    : {}),
};

// next-intl (Sprint 2.x localization): "without i18n routing" mode — the request
// config at `src/i18n/request.ts` resolves the locale + messages per request. No
// `/ar` `/en` path segments (Authority defers a v1 switcher).
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
