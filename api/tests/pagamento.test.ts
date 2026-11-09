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

describe("pagamento", () => {
  describe("dinheiro", () => {
    it("com troco: guarda o valor da nota", async () => {
      const pedido = await pedir({ quantidade: 30, tipoEntrega: "RETIRADA", formaPagamento: "DINHEIRO", precisaTroco: true, trocoPara: 50 });

      expect(pedido).toMatchObject({ formaPagamento: "DINHEIRO", status: "AGUARDANDO", total: "29.00" });
      expect(pedido.troco).toEqual({ precisa: true, para: "50.00" });
      expect(pedido.instrucaoPix).toBeNull();
    });

    it("sem troco", async () => {
      const pedido = await pedir({ quantidade: 30, tipoEntrega: "RETIRADA", formaPagamento: "DINHEIRO", precisaTroco: false });

      expect(pedido).toMatchObject({ formaPagamento: "DINHEIRO", status: "AGUARDANDO" });
      expect(pedido.troco).toEqual({ precisa: false, para: null });
    });
  });

  it("pix: começa aguardando pagamento e traz a instrução para pagar", async () => {
    const pedido = await pedir({ quantidade: 30, tipoEntrega: "RETIRADA", formaPagamento: "PIX", horarioAgendado: null });

    expect(pedido).toMatchObject({ formaPagamento: "PIX", status: "AGUARDANDO_PAGAMENTO" });
    expect(pedido.instrucaoPix).toEqual({ imediato: true, horasAntecedencia: null, pagarAte: null });
    expect(pedido.troco).toBeNull();
  });

  it("cartão: começa aguardando, sem troco e sem instrução de Pix", async () => {
    const pedido = await pedir({ quantidade: 30, tipoEntrega: "RETIRADA", formaPagamento: "CARTAO" });

    expect(pedido).toMatchObject({ formaPagamento: "CARTAO", status: "AGUARDANDO" });
    expect(pedido.troco).toBeNull();
    expect(pedido.instrucaoPix).toBeNull();
  });
});
