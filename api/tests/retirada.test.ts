import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarApp, encerrar, horarioFuturo, obterPrisma } from "./helpers.js";

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

// Cliente fictício e pedido de 10 unidades (R$ 13,00, sem taxa na retirada).
const retirada = {
  nomeCliente: "Maria Silva",
  telefone: "(44) 99123-4567",
  formaPagamento: "DINHEIRO",
  quantidade: 10,
  tipoEntrega: "RETIRADA",
};

describe("retirada no local", () => {
  it("assim que estiver pronto: sem horário agendado e sem taxa", async () => {
    const res = await postPedido(retirada);

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      status: "AGUARDANDO",
      tipoEntrega: "RETIRADA",
      horarioAgendado: null,
      quantidadeTotal: 10,
      subtotal: "13.00",
      taxaEntrega: "0.00",
      total: "13.00",
      endereco: null,
      numero: null,
      bairro: null,
    });
  });

  it("em data e horário posteriores: guarda o horário agendado", async () => {
    const horarioAgendado = horarioFuturo(72);
    const res = await postPedido({ ...retirada, horarioAgendado });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ tipoEntrega: "RETIRADA", horarioAgendado, total: "13.00" });
  });

  it("horário agendado no passado é recusado", async () => {
    const res = await postPedido({ ...retirada, horarioAgendado: "2020-01-01T10:00:00-03:00" });

    expect(res.statusCode).toBe(400);
    expect(res.json().erros[0]).toMatchObject({
      campo: "horarioAgendado",
      mensagem: "O horário escolhido deve ser no futuro.",
    });
  });
});
