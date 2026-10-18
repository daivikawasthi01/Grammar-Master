import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: { "server-only": new URL("./test/empty-module.js", import.meta.url).pathname },
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./test/setup-env.ts"],
    globalSetup: ["./test/global-setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
