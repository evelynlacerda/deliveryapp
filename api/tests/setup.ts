import { getTestDatabaseUrl } from "./test-env.js";

// Roda antes de cada arquivo de teste e antes de qualquer import da aplicação.
process.env["DATABASE_URL"] = getTestDatabaseUrl();
process.env["NODE_ENV"] = "test";
process.env["JWT_SECRET"] ??= "segredo-apenas-para-testes-0123456789abcdef";

// Vários testes criam pedidos "para agora" ou daqui a poucas horas, e a API só os aceita dentro do
// horário de atendimento (08:00 às 21:00, Brasília). Fora dele (ex.: o CI roda em UTC, de madrugada),
// o relógio dos testes é levado para as 12:00 do mesmo dia, para os testes não dependerem da hora em que rodam.
import { vi } from "vitest";

const agora = new Date();
const horaBrasilia = (agora.getUTCHours() + 24 - 3) % 24;
if (horaBrasilia < 9 || horaBrasilia >= 17) {
  const meioDia = new Date(agora.getTime() - 3 * 3600_000);
  meioDia.setUTCHours(12, 0, 0, 0);
  vi.useFakeTimers({ toFake: ["Date"], now: new Date(meioDia.getTime() + 3 * 3600_000), shouldAdvanceTime: true });
}
