import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarApp, encerrar } from "./helpers.js";

let app: FastifyInstance;

beforeAll(async () => {
  app = await criarApp();
});

afterAll(() => encerrar(app));

describe("rotas públicas do catálogo (valores padrão do banco de testes)", () => {
  it("GET /sabores lista os 8 sabores, só com id e nome", async () => {
    const res = await app.inject({ method: "GET", url: "/sabores" });

    expect(res.statusCode).toBe(200);
    const sabores = res.json();
    expect(sabores).toHaveLength(8);
    expect(sabores.map((s: { nome: string }) => s.nome)).toContain("Coxinha de frango");
    expect(Object.keys(sabores[0]).sort()).toEqual(["id", "nome"]);
  });

  it("GET /valores devolve a tabela de 10 a 100 e o preço acima de 100", async () => {
    const res = await app.inject({ method: "GET", url: "/valores" });
    const valores = res.json();

    expect(res.statusCode).toBe(200);
    expect(valores.faixas).toHaveLength(10);
    expect(valores.faixas[0]).toEqual({ quantidade: 10, valor: "13.00" });
    expect(valores.faixas[9]).toEqual({ quantidade: 100, valor: "64.00" });
    expect(valores.acimaDe).toEqual({ quantidade: 100, valorPorUnidade: "0.64" });
    expect(valores).toMatchObject({ quantidadeMinima: 10, quantidadeMaxima: 1000, passo: 10 });
  });

  it("GET /tempo-preparo devolve mínimo e máximo", async () => {
    const res = await app.inject({ method: "GET", url: "/tempo-preparo" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ minimoMin: 30, maximoMin: 60 });
  });

  it("GET /taxa-entrega devolve as taxas por faixa e o limite do frete grátis", async () => {
    const res = await app.inject({ method: "GET", url: "/taxa-entrega" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ taxaAte49: "7.00", taxaDe50a199: "5.00", entregaGratisAPartirDe: 200 });
  });

  it("GET /pix devolve a chave padrão marcada como não configurada", async () => {
    const res = await app.inject({ method: "GET", url: "/pix" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      tipo: "CPF",
      chave: "00000000000",
      chaveParaCopiar: "00000000000",
      configurada: false,
      bloqueada: false,
      titular: null,
      banco: null,
      whatsapp: null,
      antecedencia: { ateLimiteHoras: 2, acimaLimiteHoras: 4, limiteUnidades: 100 },
    });
  });
});
