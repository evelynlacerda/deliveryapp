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

describe("entrega", () => {
  it("assim que estiver pronto: 50 unidades, R$ 39,00 + R$ 5,00 de frete, sem horário", async () => {
    const pedido = await pedir({ quantidade: 50, tipoEntrega: "ENTREGA" });

    expect(pedido).toMatchObject({
      tipoEntrega: "ENTREGA",
      endereco: "Rua das Flores, 123",
      quantidadeTotal: 50,
      subtotal: "39.00",
      taxaEntrega: "5.00",
      total: "44.00",
    });
    expect(pedido.horarioAgendado).toBeNull();
  });

  it("em data e horário definidos depois: 50 unidades, R$ 44,00 e horário gravado", async () => {
    const horario = emHoras(30);
    const pedido = await pedir({ quantidade: 50, tipoEntrega: "ENTREGA", horarioAgendado: horario });

    expect(pedido).toMatchObject({ tipoEntrega: "ENTREGA", quantidadeTotal: 50, total: "44.00" });
    expect(new Date(pedido.horarioAgendado).getTime()).toBe(horario.getTime());
  });
});
