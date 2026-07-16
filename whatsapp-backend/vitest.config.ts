import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // Route and repository tests share one PostgreSQL database, so they must not
    // race each other over the same tables.
    fileParallelism: false,
    hookTimeout: 30_000,
  },
});
