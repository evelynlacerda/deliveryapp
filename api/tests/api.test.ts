import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let app: FastifyInstance;
let prisma: typeof import("../src/lib/prisma.js").prisma;
const codigosCriados: string[] = [];

const CODIGO = /^[A-HJKMNP-Z2-9]{8}$/;

const dadosCliente = {
  nomeCliente: "Cliente de Teste",
  telefone: "(11) 91234-5678",
  formaPagamento: "PIX",
};

beforeAll(async () => {
  // Import dinâmico: garante que o setup já apontou DATABASE_URL para o banco de testes.
  const { buildApp } = await import("../src/buildApp.js");
  ({ prisma } = await import("../src/lib/prisma.js"));
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await prisma.pedido.deleteMany({ where: { codigo: { in: codigosCriados } } });
  await app.close();
  await prisma.$disconnect();
});

describe("status do servidor", () => {
  it("GET /health responde 200 com status ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });
});

describe("criação de pedido", () => {
  it("30 unidades para retirada: R$ 29,00, sem frete", async () => {
    const horarioAgendado = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    const res = await app.inject({
      method: "POST",
      url: "/pedido",
      payload: { ...dadosCliente, quantidade: 30, tipoEntrega: "RETIRADA", horarioAgendado },
    });

    expect(res.statusCode).toBe(201);
    const pedido = res.json();
    codigosCriados.push(pedido.codigo);

    expect(pedido.codigo).toMatch(CODIGO);
    expect(pedido.status).toBe("AGUARDANDO_PAGAMENTO");
    expect(pedido.instrucaoPix).toMatchObject({ imediato: true, pagarAte: null });
    expect(pedido.tipoEntrega).toBe("RETIRADA");
    expect(pedido.quantidadeTotal).toBe(30);
    expect(pedido.subtotal).toBe("29.00");
    expect(pedido.taxaEntrega).toBe("0.00");
    expect(pedido.total).toBe("29.00");
    expect(pedido.itens).toEqual([{ sabor: "Misto", quantidade: 30 }]);
  });

  it("50 unidades para entrega: R$ 39,00 + R$ 5,00 de frete", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/pedido",
      payload: {
        ...dadosCliente,
        quantidade: 50,
        tipoEntrega: "ENTREGA",
        endereco: "Rua das Flores", numero: "123", bairro: "Centro",
      },
    });

    expect(res.statusCode).toBe(201);
    const pedido = res.json();
    codigosCriados.push(pedido.codigo);

    expect(pedido.codigo).toMatch(CODIGO);
    expect(pedido.tipoEntrega).toBe("ENTREGA");
    expect(pedido.endereco).toBe("Rua das Flores");
    expect(pedido.numero).toBe("123");
    expect(pedido.bairro).toBe("Centro");
    expect(pedido.quantidadeTotal).toBe(50);
    expect(pedido.subtotal).toBe("39.00");
    expect(pedido.taxaEntrega).toBe("5.00");
    expect(pedido.total).toBe("44.00");
  });
});
