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

describe("retirada no local", () => {
  it("assim que estiver pronto: 30 unidades, R$ 29,00, sem frete e sem horário", async () => {
    const pedido = await pedir({ quantidade: 30, tipoEntrega: "RETIRADA", horarioAgendado: null });

    expect(pedido).toMatchObject({ tipoEntrega: "RETIRADA", quantidadeTotal: 30, subtotal: "29.00", taxaEntrega: "0.00", total: "29.00" });
    expect(pedido.horarioAgendado).toBeNull();
    expect(pedido).not.toHaveProperty("telefone");
  });

  it("em data posterior com horário agendado: 30 unidades, R$ 29,00 e horário gravado", async () => {
    const horario = emHoras(30);
    const pedido = await pedir({ quantidade: 30, tipoEntrega: "RETIRADA", horarioAgendado: horario });

    expect(pedido).toMatchObject({ tipoEntrega: "RETIRADA", quantidadeTotal: 30, taxaEntrega: "0.00", total: "29.00" });
    expect(new Date(pedido.horarioAgendado).getTime()).toBe(horario.getTime());
  });
});
