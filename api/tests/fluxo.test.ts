import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { autenticar, criarApp, encerrar, obterPrisma, salvarConfiguracao } from "./helpers.js";

// Cenários de ponta a ponta pela API HTTP (como o front usa), do pedido do cliente ao painel do admin.

const NOME_SABOR = "Sabor de Teste Fluxo";
const cliente = { nomeCliente: "Maria Silva", telefone: "(11) 91234-5678" };

let app: FastifyInstance;
let headers: { authorization: string };
let restaurarConfiguracao: () => Promise<void>;
const codigosCriados: string[] = [];

const emHoras = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();

async function criarPedido(payload: object) {
  const res = await app.inject({ method: "POST", url: "/pedido", payload });
  if (res.statusCode === 201) codigosCriados.push(res.json().codigo);
  return res;
}
const status = (codigo: string, novo: string) =>
  app.inject({ method: "PUT", url: `/pedido/${codigo}/status`, payload: { status: novo }, headers });
const consultar = (codigo: string) => app.inject({ method: "GET", url: `/pedido/${codigo}` });

beforeAll(async () => {
  app = await criarApp();
  headers = await autenticar(app);
  restaurarConfiguracao = await salvarConfiguracao();
  await (await obterPrisma()).sabor.deleteMany({ where: { nome: NOME_SABOR } });
});

afterAll(async () => {
  const prisma = await obterPrisma();
  await restaurarConfiguracao();
  await prisma.pedido.deleteMany({ where: { codigo: { in: codigosCriados } } });
  await prisma.sabor.deleteMany({ where: { nome: NOME_SABOR } });
  await encerrar(app);
});

describe("fluxo completo", () => {
  it("pedido com Pix agendado para outro dia: cliente cria, admin aprova e finaliza, cliente acompanha", async () => {
    const criado = await criarPedido({
      ...cliente,
      quantidade: 110,
      tipoEntrega: "ENTREGA",
      endereco: "Rua das Flores, 123, Centro",
      horarioAgendado: emHoras(30),
      formaPagamento: "PIX",
    });
    expect(criado.statusCode).toBe(201);
    const { codigo } = criado.json();
    expect(criado.json()).toMatchObject({ status: "AGUARDANDO_PAGAMENTO", subtotal: "70.40", taxaEntrega: "5.00", total: "75.40", instrucaoPix: { imediato: false, horasAntecedencia: 4 } });
    expect(criado.json()).not.toHaveProperty("telefone");

    const lista = await app.inject({ method: "GET", url: "/pedidos?status=AGUARDANDO_PAGAMENTO", headers });
    expect(lista.json().find((p: { codigo: string }) => p.codigo === codigo)).toMatchObject({ telefone: "11912345678" });

    for (const proximo of ["PAGAMENTO_APROVADO", "EM_PRODUCAO", "EM_ROTA_ENTREGA", "FINALIZADO"]) {
      expect((await status(codigo, proximo)).statusCode).toBe(200);
    }
    expect((await consultar(codigo)).json().status).toBe("FINALIZADO");
  });

  it("pedido sem horário: o admin informa o tempo de preparo e o cliente vê a previsão", async () => {
    const { codigo } = (
      await criarPedido({ ...cliente, quantidade: 30, tipoEntrega: "RETIRADA", formaPagamento: "DINHEIRO" })
    ).json();
    expect((await consultar(codigo)).json()).toMatchObject({ horarioAgendado: null, tempoPreparoMin: null, previsaoEm: null });

    await app.inject({ method: "PUT", url: `/pedido/${codigo}/tempo-preparo`, payload: { minutos: 40 }, headers });

    const visto = (await consultar(codigo)).json();
    expect(visto.tempoPreparoMin).toBe(40);
    expect(new Date(visto.previsaoEm).getTime()).toBeGreaterThan(Date.now() + 39 * 60_000);
  });
});

describe("regras do pedido pela API", () => {
  it("com sabores escolhidos, o pedido lista cada sabor com a quantidade", async () => {
    const res = await criarPedido({
      ...cliente,
      quantidade: 50,
      tipoEntrega: "RETIRADA",
      formaPagamento: "CARTAO",
      sabores: [{ saborId: 1, quantidade: 20 }, { saborId: 4, quantidade: 30 }],
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().itens).toEqual([
      { sabor: "Coxinha de frango", quantidade: 20 },
      { sabor: "Bolinha de queijo", quantidade: 30 },
    ]);
  });

  it("soma dos sabores diferente da quantidade volta 400 apontando o campo 'sabores'", async () => {
    const res = await criarPedido({
      ...cliente,
      quantidade: 50,
      tipoEntrega: "RETIRADA",
      formaPagamento: "DINHEIRO",
      sabores: [{ saborId: 1, quantidade: 40 }],
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().erros).toEqual([expect.objectContaining({ campo: "sabores" })]);
  });

  it("sabor desativado some do cardápio e não pode ser pedido", async () => {
    const criar = await app.inject({ method: "POST", url: "/sabores", payload: { nome: NOME_SABOR }, headers });
    const { id } = criar.json();
    await app.inject({ method: "PATCH", url: `/sabores/${id}`, payload: { ativo: false }, headers });

    const cardapio = (await app.inject({ method: "GET", url: "/sabores" })).json();
    expect(cardapio.map((s: { id: number }) => s.id)).not.toContain(id);

    const res = await criarPedido({
      ...cliente,
      quantidade: 10,
      tipoEntrega: "RETIRADA",
      formaPagamento: "DINHEIRO",
      sabores: [{ saborId: id, quantidade: 10 }],
    });
    expect(res.statusCode).toBe(400);
  });

  it("horário agendado no passado volta 400 apontando 'horarioAgendado'", async () => {
    const res = await criarPedido({
      ...cliente,
      quantidade: 10,
      tipoEntrega: "ENTREGA",
      endereco: "Rua das Flores, 123",
      horarioAgendado: emHoras(-2),
      formaPagamento: "DINHEIRO",
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().erros).toEqual([expect.objectContaining({ campo: "horarioAgendado" })]);
  });
});
