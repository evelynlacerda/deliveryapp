import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { autenticar, criarApp, criarPedidoDireto, encerrar, obterPrisma, salvarConfiguracao } from "./helpers.js";

// Modo demonstração: Pix travado e limpeza diária de pedidos. As variáveis são lidas quando a aplicação
// é carregada (criarApp usa import dinâmico), então precisam ser definidas antes dela.
process.env["MODO_DEMO"] = "true";
process.env["CRON_SECRET"] = "segredo-do-cron-so-para-testes";

let app: FastifyInstance;
let auth: { authorization: string };
let restaurar: () => Promise<void>;

beforeAll(async () => {
  app = await criarApp();
  restaurar = await salvarConfiguracao();
  auth = await autenticar(app);
});

afterAll(async () => {
  await restaurar();
  await encerrar(app);
});

describe("Dados fixos da demo", () => {
  it("mostra sempre a chave fictícia, mesmo com outra chave no banco", async () => {
    const prisma = await obterPrisma();
    await prisma.configuracao.update({ where: { id: 1 }, data: { chavePix: "52998224725", tipoChavePix: "CPF" } });

    const res = await app.inject({ method: "GET", url: "/pix" });

    expect(res.json()).toMatchObject({ tipo: "CPF", chave: "12345678900", configurada: true, bloqueada: true });
  });

  it("ignora tentativa de trocar chave, favorecido, banco e WhatsApp, mas aceita os prazos", async () => {
    const res = await app.inject({
      method: "PUT",
      url: "/pix",
      headers: auth,
      payload: {
        tipo: "ALEATORIA",
        chave: "123e4567-e89b-42d3-a456-426614174000",
        titular: "Fulano Invasor",
        banco: "Meu Banco",
        whatsapp: "11988887777",
        antecedenciaAteLimiteHoras: 3,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      tipo: "CPF",
      chave: "12345678900",
      titular: "Maria Exemplo da Silva",
      banco: "Banco Demo",
      whatsapp: "11999990000",
      bloqueada: true,
      antecedencia: { ateLimiteHoras: 3 },
    });

    const prisma = await obterPrisma();
    const config = await prisma.configuracao.findUniqueOrThrow({ where: { id: 1 } });
    expect(config.chavePix).toBe("52998224725");
    expect(config.tipoChavePix).toBe("CPF");
    expect(config.titularPix).not.toBe("Fulano Invasor");
    expect(config.whatsappEstabelecimento).not.toBe("11988887777");
  });

  it("mantém o nome do estabelecimento, mesmo com tentativa de troca", async () => {
    const res = await app.inject({ method: "PUT", url: "/marca", headers: auth, payload: { nome: "Loja do Invasor", cores: null } });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ nome: "DeliveryApp", nomeBloqueado: true });
    expect((await app.inject({ method: "GET", url: "/marca" })).json().nome).toBe("DeliveryApp");
  });
});

describe("GET /cron/limpar-pedidos", () => {
  it("recusa sem o segredo ou com segredo errado", async () => {
    expect((await app.inject({ method: "GET", url: "/cron/limpar-pedidos" })).statusCode).toBe(401);
    const errado = await app.inject({
      method: "GET",
      url: "/cron/limpar-pedidos",
      headers: { authorization: "Bearer outro-segredo" },
    });
    expect(errado.statusCode).toBe(401);
  });

  it("apaga todos os pedidos e seus itens", async () => {
    await criarPedidoDireto({ quantidade: 10, tipoEntrega: "RETIRADA" });
    await criarPedidoDireto({ quantidade: 20, tipoEntrega: "RETIRADA" });
    const prisma = await obterPrisma();
    expect(await prisma.pedido.count()).toBeGreaterThanOrEqual(2);

    const res = await app.inject({
      method: "GET",
      url: "/cron/limpar-pedidos",
      headers: { authorization: "Bearer segredo-do-cron-so-para-testes" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().apagados).toBeGreaterThanOrEqual(2);
    expect(await prisma.pedido.count()).toBe(0);
    expect(await prisma.itemPedido.count()).toBe(0);
  });
});
