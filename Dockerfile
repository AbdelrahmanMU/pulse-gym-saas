# syntax=docker/dockerfile:1
#
# PULSE production image — multi-stage, pnpm monorepo, Next.js standalone output.
# Build on Linux (symlink-based file tracing fails on Windows): `docker build -t pulse .`
# Migrations run SEPARATELY as a release step (see docs/deployment/deployment-runbook.md),
# not from this minimal runtime image.

# ── Base: Node 20 + pnpm (via corepack) ──────────────────────────────────────
FROM node:20-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

# ── Dependencies (cached on manifest changes) ────────────────────────────────
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/auth/package.json ./packages/auth/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY packages/design-tokens/package.json ./packages/design-tokens/
RUN pnpm install --frozen-lockfile

# ── Build (generates Prisma client + compiled seed + Next standalone) ─────────
FROM deps AS build
COPY . .
# Build-time-only env, written as the root .env that prisma.config.ts, next.config.ts, and
# env.ts all load via loadEnvFile — mirrors local dev exactly. BUILD_STANDALONE lives here (not
# as a Docker ENV) because Turbo filters env vars to task subprocesses, so `next build` would
# never see an inherited ENV; loading it from .env inside next.config bypasses that. Nothing
# connects at build (routes are dynamic → nothing is prerendered); real DB/secret values are
# injected at runtime and this file lives only in the build stage, never the runtime image.
RUN printf 'DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build?schema=public\nAUTH_SECRET=build-only-placeholder-not-used-at-runtime\nBUILD_STANDALONE=1\n' > .env
# next/font fetches Google Fonts at build → the build host needs outbound network.
RUN pnpm build

# ── Runtime (minimal; runs the standalone server as non-root) ─────────────────
FROM base AS runtime
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN groupadd -r nodejs && useradd -r -g nodejs -m nextjs
# Standalone traces from the monorepo root → server.js lives under apps/web/. (No public/
# dir in this app, so nothing to copy there.)
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
