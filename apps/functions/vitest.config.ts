import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * @taipei-rat-lab/contracts is intentionally not a package.json dependency here
 * (see package.json's build script comment / plan.md Phase 2 notes) — Cloud
 * Build's plain `npm install` can't resolve the pnpm workspace protocol, so the
 * esbuild bundle inlines it via an --alias instead. Vitest needs the same alias.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@taipei-rat-lab/contracts": fileURLToPath(new URL("../../packages/contracts/src/index.ts", import.meta.url)),
    },
  },
});
