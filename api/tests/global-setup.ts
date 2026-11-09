import { execSync } from "node:child_process";
import { ADMIN_TESTE, getTestDatabaseUrl } from "./test-env.js";

export default function setup() {
  try {
    const env = {
      ...process.env,
      DATABASE_URL: getTestDatabaseUrl(),
      ADMIN_USER: ADMIN_TESTE.usuario,
      ADMIN_PASSWORD: ADMIN_TESTE.senha,
      SEED_SOBRESCREVER: "1",
    };

    execSync("npx prisma migrate deploy", { env, stdio: "inherit" });
    execSync("npx tsx prisma/seed.ts", { env, stdio: "inherit" });
  } catch (erro) {
    console.error("\nFalha ao preparar o banco de testes:", erro instanceof Error ? erro.message : erro);
    process.exit(1);
  }
}
