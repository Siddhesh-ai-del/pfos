import { defineConfig } from "vitest/config";
import path from "node:path";
import { config as loadEnv } from "dotenv";

// Load .env.local first (SUPABASE_URL / SUPABASE_SERVICE_KEY), then .env
loadEnv({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 15000,
    hookTimeout: 15000,
    // the local Supabase stack is shared mutable state — files must run in order
    fileParallelism: false,
  },
});
