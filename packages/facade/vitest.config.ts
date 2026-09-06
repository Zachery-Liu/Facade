import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "cobertura", "html"],
      thresholds: {
        statements: 63,
        branches: 41,
        functions: 44,
        lines: 63,
      },
    },
  },
});
