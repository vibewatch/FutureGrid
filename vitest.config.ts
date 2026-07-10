import { defineConfig } from "vitest/config";
import path from "path";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // `server-only` is a Next.js compiler marker that throws at runtime outside
      // the Next.js build pipeline. Vitest's Node resolver doesn't understand it,
      // so we redirect it to an empty stub. The real package continues to enforce
      // the server boundary in production; the architecture test uses readFileSync
      // (not a live import) so the source-text guard is unaffected by this alias.
      "server-only": path.resolve(__dirname, "tests/__mocks__/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    globals: true,
  },
});
