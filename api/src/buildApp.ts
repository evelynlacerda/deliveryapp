import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { env } from "./lib/env.js";
import { registrarTratadorDeErros } from "./plugins/erros.js";
import { registrarSwagger } from "./plugins/swagger.js";
import { routes } from "./routes/index.js";

// trustProxy: atrás da Vercel o IP real do cliente vem no x-forwarded-for (rate-limit).
export const opcoesFastify = {
  logger: env.NODE_ENV !== "test",
  trustProxy: true,
};

/** Registra CORS, rate limit, JWT, validação e rotas em uma instância do Fastify já criada. */
export async function configurarApp(instancia: FastifyInstance) {
  const app = instancia.withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registrarTratadorDeErros(app);

  // O padrão do @fastify/cors libera só GET, HEAD e POST: sem listar PUT e PATCH, o navegador
  // barra no preflight todas as edições do admin (status, preços, Pix, sabores...).
  await app.register(cors, {
    origin: env.WEB_URL,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });
  await app.register(rateLimit, { global: false });
  await app.register(jwt, { secret: env.JWT_SECRET, sign: { expiresIn: "12h" } });
  // O swagger precisa ser registrado antes das rotas para enxergá-las.
  await registrarSwagger(app);
  await app.register(routes);

  return app;
}

export async function buildApp() {
  return configurarApp(Fastify(opcoesFastify));
}
