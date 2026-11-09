import { createHash, timingSafeEqual } from "node:crypto";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { env } from "../lib/env.js";
import { limparPedidos } from "../services/pedidos.js";

const erroSchema = z.object({ mensagem: z.string() });

function segredoConfere(recebido: string | undefined, esperado: string) {
  // Compara os hashes (tamanho fixo) em tempo constante.
  const hash = (v: string) => createHash("sha256").update(v).digest();
  return timingSafeEqual(hash(recebido ?? ""), hash(`Bearer ${esperado}`));
}

// Rotas chamadas pelo agendador (Vercel Cron, ver vercel.json). Não usam o login do admin: exigem o CRON_SECRET.
export const cronRoutes: FastifyPluginAsyncZod = async (app) => {
  // Demo pública: apaga todos os pedidos (e os itens) a cada 24 horas para o banco não encher.
  app.get(
    "/cron/limpar-pedidos",
    {
      schema: {
        response: {
          200: z.object({ apagados: z.number() }),
          401: erroSchema,
          503: erroSchema,
        },
      },
    },
    async (request, reply) => {
      if (!env.CRON_SECRET) {
        return reply.code(503).send({ mensagem: "Limpeza agendada desligada (CRON_SECRET não definido)." });
      }
      if (!segredoConfere(request.headers.authorization, env.CRON_SECRET)) {
        return reply.code(401).send({ mensagem: "Não autorizado." });
      }
      return { apagados: await limparPedidos() };
    },
  );
};
