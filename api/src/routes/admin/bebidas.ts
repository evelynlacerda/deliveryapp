import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  atualizarBebidaSchema,
  atualizarVendaBebidasSchema,
  bebidaRespostaSchema,
  bebidasAdminRespostaSchema,
  criarBebidaSchema,
  enviarFotoSchema,
  idBebidaSchema,
  vendaBebidasRespostaSchema,
} from "../../schemas/bebidas.js";
import {
  atualizarBebida,
  atualizarVendaBebidas,
  criarBebida,
  excluirBebida,
  listarBebidasAdmin,
  removerFoto,
  salvarFoto,
} from "../../services/bebidas.js";

export const adminBebidasRoutes: FastifyPluginAsyncZod = async (app) => {
  // Lista todas (também as desativadas) e informa se a venda de bebidas está ligada no app.
  app.get(
    "/admin/bebidas",
    { schema: { response: { 200: bebidasAdminRespostaSchema } } },
    async () => listarBebidasAdmin(),
  );

  app.put(
    "/bebidas/venda",
    { schema: { body: atualizarVendaBebidasSchema, response: { 200: vendaBebidasRespostaSchema } } },
    async (request) => atualizarVendaBebidas(request.body.ativa),
  );

  app.post(
    "/bebidas",
    { schema: { body: criarBebidaSchema, response: { 201: bebidaRespostaSchema } } },
    async (request, reply) => reply.status(201).send(await criarBebida(request.body)),
  );

  app.patch(
    "/bebidas/:id",
    { schema: { params: idBebidaSchema, body: atualizarBebidaSchema, response: { 200: bebidaRespostaSchema } } },
    async (request) => atualizarBebida(request.params.id, request.body),
  );

  app.delete("/bebidas/:id", { schema: { params: idBebidaSchema } }, async (request, reply) => {
    await excluirBebida(request.params.id);
    return reply.status(204).send();
  });

  // Foto enviada como JSON (base64), como a logo: sem plugin de upload e funciona em serverless.
  app.put(
    "/bebidas/:id/foto",
    {
      bodyLimit: 1024 * 1024,
      schema: { params: idBebidaSchema, body: enviarFotoSchema, response: { 200: bebidaRespostaSchema } },
    },
    async (request) => salvarFoto(request.params.id, request.body.tipo, request.body.dados),
  );

  app.delete(
    "/bebidas/:id/foto",
    { schema: { params: idBebidaSchema, response: { 200: bebidaRespostaSchema } } },
    async (request) => removerFoto(request.params.id),
  );
};
