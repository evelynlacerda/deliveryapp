import type { FastifyInstance } from "fastify";
import { expect } from "vitest";
import { ADMIN_TESTE } from "./test-env.js";

/*
 * Imports dinâmicos: garantem que tests/setup.ts já apontou DATABASE_URL
 * para o banco de testes antes de a aplicação ser carregada.
 */

export async function criarApp(): Promise<FastifyInstance> {
  const { buildApp } = await import("../src/buildApp.js");
  const app = await buildApp();
  await app.ready();
  return app;
}

export async function obterPrisma() {
  return (await import("../src/lib/prisma.js")).prisma;
}

export async function encerrar(app: FastifyInstance) {
  await app.close();
  await (await obterPrisma()).$disconnect();
}

export async function autenticar(app: FastifyInstance) {
  const res = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { usuario: ADMIN_TESTE.usuario, senha: ADMIN_TESTE.senha },
  });
  expect(res.statusCode).toBe(200);
  return { authorization: `Bearer ${res.json().token}` };
}

/** 
 * Cria o pedido pelo service (sem HTTP) para não gastar o rate-limit do POST /pedido.
 * */
export async function criarPedidoDireto(dados: {
  quantidade: number;
  tipoEntrega: "ENTREGA" | "RETIRADA";
  formaPagamento?: "DINHEIRO" | "CARTAO" | "PIX";
  precisaTroco?: boolean;
  trocoPara?: number;
  horarioAgendado?: Date | null;
}) {
  const { criarPedido } = await import("../src/services/pedidos.js");
  const entrega = dados.tipoEntrega === "ENTREGA";

  return criarPedido({
    nomeCliente: "Cliente de Teste",
    telefone: "11912345678",
    formaPagamento: dados.formaPagamento ?? "DINHEIRO",
    precisaTroco: dados.precisaTroco ?? false,
    trocoPara: dados.trocoPara,
    quantidade: dados.quantidade,
    tipoEntrega: dados.tipoEntrega,
    sabores: [],
    endereco: entrega ? "Rua das Flores, 123" : undefined,
    horarioAgendado:
      dados.horarioAgendado === undefined
        ? entrega
          ? undefined
          : new Date(Date.now() + 2 * 3600_000)
        : (dados.horarioAgendado ?? undefined),
  });
}

/** 
 * Guarda a configuração e a tabela de preços; devolve a função que as restaura. 
 * */
export async function salvarConfiguracao() {
  const prisma = await obterPrisma();
  const { id, ...config } = await prisma.configuracao.findUniqueOrThrow({
    where: { id: 1 },
  });
  const faixas = await prisma.faixaPreco.findMany();

  const { Prisma } = await import("../src/generated/prisma/client.js");

  return async () => {
    // Coluna Json nula precisa de Prisma.DbNull para ser gravada de volta.
    await prisma.configuracao.update({
      where: { id },
      data: {
        ...config,
        cores: config.cores === null ? Prisma.DbNull : config.cores,
      },
    });
    for (const faixa of faixas) {
      await prisma.faixaPreco.update({
        where: { id: faixa.id },
        data: { valor: faixa.valor },
      });
    }
  };
}
