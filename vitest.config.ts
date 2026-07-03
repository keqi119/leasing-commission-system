import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@lcs/commission-engine": resolve(__dirname, "packages/commission-engine/src/index.ts"),
      "@lcs/database": resolve(__dirname, "packages/database/src/index.ts"),
      "@lcs/shared": resolve(__dirname, "packages/shared/src/index.ts"),
      "@": resolve(__dirname, "apps/web/src")
    }
  }
});
