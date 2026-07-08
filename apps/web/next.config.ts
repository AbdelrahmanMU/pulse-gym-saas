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
  // Linting runs through the shared flat config via `turbo run lint` (T-21); Next 16
  // removed the bundled ESLint integration, so there is no `eslint` config key.
  //
  // Client Router Cache TTL (Performance Recovery, Task 2). Next's default keeps
  // dynamic pages for 0s, so EVERY navigation re-fetches and re-renders the target
  // route — list→detail→back always pays a full server round trip + skeleton flash.
  // 30s makes repeat navigation within half a minute instant from the client cache.
  // Trade-off (accepted): a revisited page can be up to 30s stale; server actions
  // revalidate their paths immediately, so post-mutation data stays fresh.
  //
  // ⚠ This value is part of a MEASURED, MATCHED SET with the Next version and the
  // redirect-on-success mutation idiom (see modules/memberships/actions.ts). During
  // the Performance Recovery sprint, production builds on Next 15.5.x (with or
  // without staleTimes) and Next 16 WITHOUT staleTimes deadlocked server-action
  // success responses (pending button forever); Next 16.2 WITH staleTimes:30 and
  // unique-URL redirects measured 0 hangs across the whole battery. Do not change
  // the Next version or this setting independently — re-run the lifecycle e2e spec
  // against a production build (`next build && next start`) after any change here.
  experimental: {
    staleTimes: { dynamic: 30 },
  },
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
