import { defineConfig, env } from "prisma/config";

// Prisma 7 configuration. The datasource connection URL lives here (removed from
// the `datasource` block in schema.prisma). See /docs/database/prisma-7-strategy.md.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
