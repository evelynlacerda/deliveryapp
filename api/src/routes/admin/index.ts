import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { authenticate } from "../../plugins/auth.js";
import { adminBebidasRoutes } from "./bebidas.js";
import { adminConfigRoutes } from "./config.js";
import { adminMarcaRoutes } from "./marca.js";
import { adminPedidosRoutes } from "./pedidos.js";
import { adminSaboresRoutes } from "./sabores.js";

/*
* O hook vale para todas as rotas registradas dentro deste plugin:
* nenhuma rota do admin fica pública por esquecimento.
*/
export const adminRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", authenticate);

  // Marca no Swagger toda rota do admin como protegida (cadeado + tag Admin).
  app.addHook("onRoute", (rota) => {
    rota.schema = { ...rota.schema, tags: ["Admin"], security: [{ bearerAuth: [] }] };
  });

  await app.register(adminPedidosRoutes);
  await app.register(adminConfigRoutes);
  await app.register(adminMarcaRoutes);
  await app.register(adminSaboresRoutes);
  await app.register(adminBebidasRoutes);
};
