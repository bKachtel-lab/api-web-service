import { defineConfig } from "vitest/config";
import "dotenv/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    // Exécution séquentielle pour éviter les conflits d'accès à la base de test en E2E
    fileParallelism: false,
    
    coverage: {
      enabled: true,
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
