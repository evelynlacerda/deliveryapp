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

// Cliente fictício e pedido de 50 unidades (R$ 39,00 + R$ 5,00 de taxa de entrega).
const entrega = {
  nomeCliente: "João Pereira",
  telefone: "(44) 99876-5432",
  formaPagamento: "DINHEIRO",
  quantidade: 50,
  tipoEntrega: "ENTREGA",
  endereco: "Rua das Flores",
  numero: "123",
  bairro: "Centro",
};

describe("entrega", () => {
  it("assim que estiver pronto: guarda rua, número, bairro e referência", async () => {
    const res = await postPedido({ ...entrega, pontoReferencia: "Casa B, portão azul" });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      status: "AGUARDANDO",
      tipoEntrega: "ENTREGA",
      horarioAgendado: null,
      endereco: "Rua das Flores",
      numero: "123",
      bairro: "Centro",
      pontoReferencia: "Casa B, portão azul",
      subtotal: "39.00",
      taxaEntrega: "5.00",
      total: "44.00",
    });

    const consulta = await app.inject({ method: "GET", url: `/pedido/${res.json().codigo}` });
    expect(consulta.json()).toMatchObject({ endereco: "Rua das Flores", numero: "123", bairro: "Centro" });
  });

  it("em data e horário posteriores: guarda o horário agendado", async () => {
    const horarioAgendado = horarioFuturo(48);
    const res = await postPedido({ ...entrega, horarioAgendado });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ tipoEntrega: "ENTREGA", horarioAgendado, total: "44.00" });
  });

  it("a referência é opcional", async () => {
    const res = await postPedido(entrega);

    expect(res.statusCode).toBe(201);
    expect(res.json().pontoReferencia).toBeNull();
  });

  it.each([
    ["endereço", "endereco", "Informe o endereço de entrega."],
    ["número", "numero", "Informe o número da residência."],
    ["bairro", "bairro", "Informe o bairro."],
  ])("sem %s: 400 apontando o campo", async (_nome, campo, mensagem) => {
    const res = await postPedido({ ...entrega, [campo]: undefined });

    expect(res.statusCode).toBe(400);
    expect(res.json().erros).toEqual([expect.objectContaining({ campo, mensagem })]);
  });

  it("número e bairro só com espaços contam como não informados", async () => {
    const res = await postPedido({ ...entrega, numero: "  ", bairro: "" });

    expect(res.statusCode).toBe(400);
    expect(res.json().erros.map((e: { campo: string }) => e.campo)).toEqual(["numero", "bairro"]);
  });
});
