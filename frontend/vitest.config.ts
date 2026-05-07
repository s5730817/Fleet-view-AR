import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}", "tests/**/*.test.ts"],
    projects: [
      {
        test: {
          include: ["tests/security/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          include: ["src/**/*.{test,spec}.{ts,tsx}"],
          environment: "jsdom",
        },
      },
    ],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});