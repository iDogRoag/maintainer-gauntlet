import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["**/node_modules/**", "**/dist/**", "scenarios/**/fixture/**"],
    globals: true,
    testTimeout: 30_000
  }
});
