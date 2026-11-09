import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarApp, criarPedidoDireto, encerrar, obterPrisma } from "./helpers.js";

let app: FastifyInstance;
const codigosCriados: string[] = [];

async function pedir(dados: Parameters<typeof criarPedidoDireto>[0]) {
  const criado = await criarPedidoDireto(dados);
  codigosCriados.push(criado.codigo);
  const res = await app.inject({ method: "GET", url: `/pedido/${criado.codigo}` });
  expect(res.statusCode).toBe(200);
  return res.json();
}

const emHoras = (h: number) => new Date(Date.now() + h * 3600_000);

beforeAll(async () => {
  app = await criarApp();
});

afterAll(async () => {
  await (await obterPrisma()).pedido.deleteMany({ where: { codigo: { in: codigosCriados } } });
  await encerrar(app);
});

describe("pedidos grandes", () => {
  it("1000 unidades (o máximo) para entrega: R$ 640,00, frete grátis", async () => {
    const pedido = await pedir({ quantidade: 1000, tipoEntrega: "ENTREGA" });

    expect(pedido).toMatchObject({ quantidadeTotal: 1000, subtotal: "640.00", taxaEntrega: "0.00", total: "640.00" });
  });

  it("acima de 1000 unidades é recusado com 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/pedido",
      payload: {
        nomeCliente: "Cliente de Teste",
        telefone: "(11) 91234-5678",
        formaPagamento: "PIX",
        quantidade: 1010,
        tipoEntrega: "RETIRADA",
      },
    });

    expect(res.statusCode).toBe(400);
  });
});

describe("pedidos com valor quebrado", () => {
  it("110 unidades para retirada: R$ 70,40", async () => {
    const pedido = await pedir({ quantidade: 110, tipoEntrega: "RETIRADA" });

    expect(pedido).toMatchObject({ subtotal: "70.40", taxaEntrega: "0.00", total: "70.40" });
  });

  it("190 unidades para entrega: R$ 121,60 + R$ 5,00 de frete = R$ 126,60", async () => {
    const pedido = await pedir({ quantidade: 190, tipoEntrega: "ENTREGA" });

    expect(pedido).toMatchObject({ subtotal: "121.60", taxaEntrega: "5.00", total: "126.60" });
  });
});
