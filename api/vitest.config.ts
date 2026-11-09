import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    globalSetup: ["./tests/global-setup.ts"],
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
    // Os testes de Pix editam a chave; o bloqueio da demo é testado à parte, ligando a variável no próprio teste.
    env: { MODO_DEMO: "false" },
  },
});
