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

// Cliente fictício; retirada para não somar taxa de entrega.
const pedido = {
  nomeCliente: "Ana Souza",
  telefone: "(44) 99123-4567",
  formaPagamento: "DINHEIRO",
  tipoEntrega: "RETIRADA",
};

// Um valor pode quebrar mais de uma regra do mesmo campo (ex.: abaixo do mínimo e não múltiplo de 10): conta o campo uma vez.
const camposComErro = (res: { json: () => { erros: { campo: string }[] } }) => [...new Set(res.json().erros.map((e) => e.campo))];

// O limite do POST /pedido é de 10 por minuto: este arquivo usa menos que isso na soma dos casos que chegam à API.
describe("pedidos acima de 1000 unidades", () => {
  it("1000 é o máximo aceito (R$ 0,64 por unidade)", async () => {
    const res = await postPedido({ ...pedido, quantidade: 1000 });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ quantidadeTotal: 1000, total: "640.00" });
  });

  it.each([1010, 5000])("%i unidades é recusado", async (quantidade) => {
    const res = await postPedido({ ...pedido, quantidade });

    expect(res.statusCode).toBe(400);
    expect(camposComErro(res)).toEqual(["quantidade"]);
  });
});

describe("pedidos com quantidade quebrada", () => {
  it.each([
    ["decimal", 10.5],
    ["não múltipla de 10", 15],
    ["acima de 1000 e não múltipla de 10", 1005],
    ["abaixo do mínimo", 5],
  ])("%s (%s) é recusado", async (_motivo, quantidade) => {
    const res = await postPedido({ ...pedido, quantidade });

    expect(res.statusCode).toBe(400);
    expect(camposComErro(res)).toEqual(["quantidade"]);
  });
});
