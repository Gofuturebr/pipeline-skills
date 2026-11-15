import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const porta = Number(process.env.PORTA_E2E ?? 3100);

// Os testes de ponta a ponta usam o banco de teste (DATABASE_URL_TESTE), que é
// apagado e recriado no início. Rode `npm run build` antes.
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60000,
  workers: 1,
  globalSetup: "./tests/e2e/preparar.ts",
  use: {
    baseURL: `http://localhost:${porta}`,
    viewport: { width: 1366, height: 768 },
  },
  webServer: {
    command: `npx next start -p ${porta}`,
    url: `http://localhost:${porta}`,
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      DATABASE_URL: process.env.DATABASE_URL_TESTE ?? "",
      ADMIN_PASSWORD: "gestor-e2e",
      FACILITADOR_PASSWORD: "facilitador-e2e",
      SESSION_SECRET: "segredo-e2e-com-mais-de-16-caracteres",
      NEXT_PUBLIC_SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      // Os testes de navegador usam a IA simulada: sem custo e sem variação.
      IA_SIMULADA: "1",
      ANTHROPIC_API_KEY: "",
    },
  },
});
