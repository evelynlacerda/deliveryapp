import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { bebidaRespostaSchema, idBebidaSchema } from "../schemas/bebidas.js";
import { listarBebidasDisponiveis, obterFoto } from "../services/bebidas.js";

export const bebidasRoutes: FastifyPluginAsyncZod = async (app) => {
  // Bebidas que o cliente pode escolher no pedido (vazio = a seção de bebidas não aparece).
  app.get("/bebidas", { schema: { response: { 200: z.array(bebidaRespostaSchema) } } }, async () =>
    listarBebidasDisponiveis(),
  );

  // Pública: o <img> não envia token. Resposta binária, então sem schema de resposta.
  app.get(
    "/bebidas/:id/foto",
    { schema: { params: idBebidaSchema, querystring: z.object({ v: z.string().optional() }) } },
    async (request, reply) => {
      const foto = await obterFoto(request.params.id);
      if (!foto) return reply.status(404).send({ mensagem: "Nenhuma foto cadastrada." });

      return reply
        .header("content-type", foto.tipo)
        // A URL leva ?v=<versão>: cada foto nova tem outra URL, então o cache pode ser longo.
        .header("cache-control", "public, max-age=31536000, immutable")
        .header("x-content-type-options", "nosniff")
        .header("content-security-policy", "default-src 'none'; sandbox")
        // O front fica em outro domínio e exibe a imagem com <img>.
        .header("cross-origin-resource-policy", "cross-origin")
        .send(foto.dados);
    },
  );
};
