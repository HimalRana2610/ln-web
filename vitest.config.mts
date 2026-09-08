import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

// .mts so Vite loads this natively as ESM; `import.meta.dirname` needs Node 20.11+.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": resolve(import.meta.dirname, "./src") },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
