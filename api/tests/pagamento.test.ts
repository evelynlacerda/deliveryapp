import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarApp, encerrar, obterPrisma } from "./helpers.js";

let app: FastifyInstance;
const codigosCriados: string[] = [];

async function postPedido(payload: object) {
  const res = await app.inject({ method: "POST", url: "/pedido", payload });
  if (res.statusCode === 201) codigosCriados.push(res.json().codigo);
  return res;
}

beforeAll(async () => {
  app = await criarApp();
});

afterAll(async () => {
  await (await obterPrisma()).pedido.deleteMany({ where: { codigo: { in: codigosCriados } } });
  await encerrar(app);
});

// Cliente fictício e pedido de 10 unidades para retirada (total R$ 13,00).
const pedido = {
  nomeCliente: "Carlos Lima",
  telefone: "(44) 99123-4567",
  quantidade: 10,
  tipoEntrega: "RETIRADA",
};

describe("pagamento em dinheiro", () => {
  it("com troco: guarda para quanto o cliente precisa de troco", async () => {
    const res = await postPedido({ ...pedido, formaPagamento: "DINHEIRO", precisaTroco: true, trocoPara: 50 });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      status: "AGUARDANDO",
      formaPagamento: "DINHEIRO",
      troco: { precisa: true, para: "50.00" },
      instrucaoPix: null,
    });
  });

  it("sem troco", async () => {
    const res = await postPedido({ ...pedido, formaPagamento: "DINHEIRO", precisaTroco: false });

    expect(res.statusCode).toBe(201);
    expect(res.json().troco).toEqual({ precisa: false, para: null });
  });

  it("com troco, mas sem informar o valor: 400", async () => {
    const res = await postPedido({ ...pedido, formaPagamento: "DINHEIRO", precisaTroco: true });

    expect(res.statusCode).toBe(400);
    expect(res.json().erros[0]).toMatchObject({
      campo: "trocoPara",
      mensagem: "Informe para quanto você precisa de troco.",
    });
  });

  it("troco para valor menor ou igual ao total do pedido: 400", async () => {
    const res = await postPedido({ ...pedido, formaPagamento: "DINHEIRO", precisaTroco: true, trocoPara: 13 });

    expect(res.statusCode).toBe(400);
    expect(res.json().mensagem).toContain("O valor para o troco deve ser maior que o total do pedido");
  });
});

describe("pagamento com Pix", () => {
  it("começa aguardando o pagamento, que é feito no ato do pedido", async () => {
    const res = await postPedido({ ...pedido, formaPagamento: "PIX" });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      status: "AGUARDANDO_PAGAMENTO",
      formaPagamento: "PIX",
      troco: null,
      instrucaoPix: { imediato: true, pagarAte: null },
    });
  });
});

describe("pagamento no cartão", () => {
  it("começa em AGUARDANDO, sem instrução de Pix e sem troco", async () => {
    const res = await postPedido({ ...pedido, formaPagamento: "CARTAO" });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ status: "AGUARDANDO", formaPagamento: "CARTAO", troco: null, instrucaoPix: null });
  });

  it("ignora troco enviado junto com o cartão", async () => {
    const res = await postPedido({ ...pedido, formaPagamento: "CARTAO", precisaTroco: true, trocoPara: 50 });

    expect(res.statusCode).toBe(201);
    expect(res.json().troco).toBeNull();
  });
});

describe("forma de pagamento inválida", () => {
  it("BOLETO é recusado", async () => {
    const res = await postPedido({ ...pedido, formaPagamento: "BOLETO" });

    expect(res.statusCode).toBe(400);
  });
});
