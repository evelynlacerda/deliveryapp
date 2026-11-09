import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { autenticar, criarApp, encerrar } from "./helpers.js";
import { ADMIN_TESTE } from "./test-env.js";

const CPF_VALIDO = "529.982.247-25";

let app: FastifyInstance;
let headers: { authorization: string };

const get = (url: string) => app.inject({ method: "GET", url, headers });

beforeAll(async () => {
  app = await criarApp();
  headers = await autenticar(app);
});

afterAll(() => encerrar(app));

describe("proteção das rotas do admin", () => {
  const rotas = [
    { method: "GET", url: "/pedidos" },
    { method: "PUT", url: "/pedido/ABCD2345/status", payload: { status: "EM_PRODUCAO" } },
    { method: "PUT", url: "/tempo-preparo", payload: { minimoMin: 30, maximoMin: 60 } },
    { method: "PUT", url: "/taxa-entrega", payload: { taxaAte49: 7, taxaDe50a199: 5 } },
    { method: "PUT", url: "/pix", payload: { tipo: "CPF", chave: CPF_VALIDO } },
    { method: "PUT", url: "/valores", payload: {} },
    { method: "GET", url: "/admin/sabores" },
    { method: "POST", url: "/sabores", payload: { nome: "Sabor de Teste" } },
    { method: "PATCH", url: "/sabores/1", payload: { ativo: false } },
  ] as const;

  it.each(rotas)("$method $url sem token responde 401", async ({ method, url, ...resto }) => {
    const res = await app.inject({ method, url, payload: "payload" in resto ? (resto.payload as object) : undefined });

    expect(res.statusCode).toBe(401);
  });

  it("token inválido responde 401", async () => {
    const res = await app.inject({ method: "GET", url: "/pedidos", headers: { authorization: "Bearer invalido" } });

    expect(res.statusCode).toBe(401);
  });

  it("as rotas públicas continuam abertas", async () => {
    expect((await app.inject({ method: "GET", url: "/sabores" })).statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: "/pix" })).statusCode).toBe(200);
  });
});

describe("login", () => {
  it("senha errada responde 401", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { usuario: ADMIN_TESTE.usuario, senha: "senha-errada" },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().mensagem).toBe("Usuário ou senha inválidos.");
  });

  it("usuário inexistente responde 401 com a mesma mensagem", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { usuario: "nao_existe", senha: "qualquer" },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().mensagem).toBe("Usuário ou senha inválidos.");
  });

  it("o token devolvido dá acesso às rotas do admin", async () => {
    expect((await get("/pedidos")).statusCode).toBe(200);
  });
});
