import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { adminRoutes } from "./admin/index.js";
import { authRoutes } from "./auth.js";
import { catalogoRoutes } from "./catalogo.js";
import { cronRoutes } from "./cron.js";
import { healthRoutes } from "./health.js";
import { marcaRoutes } from "./marca.js";
import { pedidosRoutes } from "./pedidos.js";

export const routes: FastifyPluginAsyncZod = async (app) => {
  await app.register(healthRoutes);
  await app.register(cronRoutes);
  await app.register(catalogoRoutes);
  await app.register(marcaRoutes);
  await app.register(pedidosRoutes);
  await app.register(authRoutes);
  await app.register(adminRoutes);
};
