import "dotenv/config";
import { z } from "zod";

/*
 * Demo pública: trava nome do estabelecimento, chave Pix, favorecido, banco e WhatsApp em valores fictícios (nenhum visitante consegue trocar pelos dele). Para usar o app de verdade, defina MODO_DEMO=false.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3333),
  WEB_URL: z.url().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, "Use pelo menos 32 caracteres."),
  MODO_DEMO: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  // Segredo que a Vercel Cron envia (Authorization: Bearer) ao chamar a limpeza diária. Sem ele, a rota fica desligada. Essa limpeza é feita para deletar pedidos aleatórios feito pelos usuários para testar a demo.
  CRON_SECRET: z.string().min(16, "Use pelo menos 16 caracteres.").optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "Variáveis de ambiente inválidas:",
    z.flattenError(parsed.error).fieldErrors,
  );
  process.exit(1);
}

export const env = parsed.data;
