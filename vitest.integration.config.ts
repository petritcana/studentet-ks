import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Testet e integrimit: punojnë mbi bazën e vërtetë të zhvillimit, prandaj nuk
 * hyjnë te `npm run test`. Lëshohen me `npm run test:integration`, dhe pas tyre
 * `npm run db:seed`.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["integration/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 60_000,
  },
});
