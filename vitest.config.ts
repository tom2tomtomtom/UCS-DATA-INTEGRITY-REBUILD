import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["tests/**/*.{test,spec}.ts", "src/**/*.{test,spec}.ts"],
    passWithNoTests: true
  }
});
