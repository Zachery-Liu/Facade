import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "cobertura", "html"],
      thresholds: {
        statements: 69,
        branches: 84,
        functions: 68,
        lines: 69,
      },
    },
  },
});
