import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";
import { jsonSchemaTransform } from "fastify-type-provider-zod";

// Agrupa as rotas no Swagger pelo prefixo da URL.
function tagDaRota(url: string) {
  if (url.startsWith("/auth")) return "Autenticação";
  if (url.startsWith("/pedido")) return "Pedidos";
  if (url.startsWith("/cron")) return "Cron";
  if (url === "/health") return "Saúde";
  return "Catálogo";
}

/** Documentação interativa em /docs (OpenAPI em /docs/json), gerada dos schemas zod das rotas. */
export async function registrarSwagger(app: FastifyInstance) {
  await app.register(swagger, {
    openapi: {
      info: {
        title: "API do DeliveryApp",
        description: "API do app de delivery de mini salgados.",
        version: "1.0.0",
      },
      tags: [
        { name: "Catálogo" },
        { name: "Pedidos" },
        { name: "Autenticação" },
        { name: "Admin", description: "Exige token JWT (botão Authorize)." },
        { name: "Cron" },
        { name: "Saúde" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        },
      },
    },
    transform: (entrada) => {
      const resultado = jsonSchemaTransform(entrada);
      const schema = resultado.schema as Record<string, unknown>;
      // Rotas do admin já chegam com tag e segurança (hook em routes/admin/index.ts).
      schema.tags ??= [tagDaRota(entrada.url)];
      return resultado;
    },
  });

  await app.register(swaggerUi, { routePrefix: "/docs" });
}
