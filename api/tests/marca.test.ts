import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { validarLogo } from "../src/lib/logo.js";
import { autenticar, criarApp, encerrar, salvarConfiguracao } from "./helpers.js";

// PNG mínimo válido (1x1 pixel).
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#d79489"/></svg>';

let app: FastifyInstance;
let headers: { authorization: string };
let restaurarConfiguracao: () => Promise<void>;

const put = (url: string, payload: unknown, comToken = true) =>
  app.inject({ method: "PUT", url, payload: payload as object, headers: comToken ? headers : {} });
const enviarLogo = (tipo: string, conteudo: Buffer | string) =>
  put("/marca/logo", { tipo, dados: Buffer.from(conteudo).toString("base64") });

beforeAll(async () => {
  app = await criarApp();
  headers = await autenticar(app);
  restaurarConfiguracao = await salvarConfiguracao();
});

afterAll(async () => {
  await restaurarConfiguracao();
  await encerrar(app);
});

describe("GET /marca (público)", () => {
  it("devolve o nome padrão, sem logo e sem cores personalizadas", async () => {
    const res = await app.inject({ method: "GET", url: "/marca" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ nome: "DeliveryApp", nomeBloqueado: false, logoVersao: null, logoEscuraVersao: null, cores: null });
  });

  it("GET /marca/logo sem logo cadastrada devolve 404", async () => {
    expect((await app.inject({ method: "GET", url: "/marca/logo" })).statusCode).toBe(404);
  });
});

describe("PUT /marca (admin)", () => {
  it("exige autenticação", async () => {
    expect((await put("/marca", { nome: "Outra", cores: null }, false)).statusCode).toBe(401);
    expect((await put("/marca/logo", { tipo: "image/png", dados: "AAAA" }, false)).statusCode).toBe(401);
  });

  it("salva nome e cores (hex em minúsculas) e a rota pública reflete", async () => {
    const cores = { publico: { claro: { fundo: "#F6F6F6", destaque: "#D79489" }, escuro: { primaria: "#112233" } }, admin: { claro: { barraLateral: "#0A0B0C" } } };

    const res = await put("/marca", { nome: "  Salgados da Maria ", cores });

    expect(res.statusCode).toBe(200);
    expect(res.json().nome).toBe("Salgados da Maria");
    expect(res.json().cores).toEqual({
      publico: { claro: { fundo: "#f6f6f6", destaque: "#d79489" }, escuro: { primaria: "#112233" } },
      admin: { claro: { barraLateral: "#0a0b0c" } },
    });
    expect((await app.inject({ method: "GET", url: "/marca" })).json()).toEqual(res.json());
  });

  it("cores nulas restauram o tema padrão", async () => {
    await put("/marca", { nome: "Teste", cores: { publico: { claro: { fundo: "#ffffff" } } } });

    const res = await put("/marca", { nome: "Teste", cores: null });

    expect(res.json().cores).toBeNull();
  });

  it("recusa cor inválida, nome curto e chaves desconhecidas de cor são ignoradas", async () => {
    expect((await put("/marca", { nome: "Teste", cores: { publico: { claro: { fundo: "vermelho" } } } })).statusCode).toBe(400);
    expect((await put("/marca", { nome: "Teste", cores: { publico: { claro: { fundo: "#fff" } } } })).statusCode).toBe(400);
    expect((await put("/marca", { nome: "A", cores: null })).statusCode).toBe(400);
    expect((await put("/marca", { nome: "x".repeat(61), cores: null })).statusCode).toBe(400);
  });
});

describe("logo (PNG ou SVG)", () => {
  it("envia um PNG, informa a versão em /marca e serve a imagem com cabeçalhos de segurança", async () => {
    const res = await enviarLogo("image/png", PNG_1X1);

    expect(res.statusCode).toBe(200);
    expect(res.json().logoVersao).toEqual(expect.any(Number));

    const img = await app.inject({ method: "GET", url: `/marca/logo?v=${res.json().logoVersao}` });
    expect(img.statusCode).toBe(200);
    expect(img.headers["content-type"]).toBe("image/png");
    expect(img.headers["x-content-type-options"]).toBe("nosniff");
    expect(img.headers["content-security-policy"]).toContain("sandbox");
    expect(img.headers["cache-control"]).toContain("immutable");
    expect(Buffer.compare(img.rawPayload, PNG_1X1)).toBe(0);
  });

  it("aceita SVG simples e troca a logo anterior (nova versão)", async () => {
    const a = await enviarLogo("image/png", PNG_1X1);
    await new Promise((ok) => setTimeout(ok, 5));
    const b = await enviarLogo("image/svg+xml", SVG);

    expect(b.statusCode).toBe(200);
    expect(b.json().logoVersao).toBeGreaterThan(a.json().logoVersao);
    const img = await app.inject({ method: "GET", url: "/marca/logo" });
    expect(img.headers["content-type"]).toBe("image/svg+xml");
    expect(img.body).toContain("<svg");
  });

  it("remove a logo", async () => {
    await enviarLogo("image/png", PNG_1X1);

    const res = await app.inject({ method: "DELETE", url: "/marca/logo", headers });

    expect(res.statusCode).toBe(200);
    expect(res.json().logoVersao).toBeNull();
    expect((await app.inject({ method: "GET", url: "/marca/logo" })).statusCode).toBe(404);
  });

  describe("logo do modo escuro", () => {
    const enviarEscura = (tipo: string, conteudo: Buffer | string) =>
      put("/marca/logo", { modo: "escuro", tipo, dados: Buffer.from(conteudo).toString("base64") });
    const apagar = (modo?: string) =>
      app.inject({ method: "DELETE", url: modo ? `/marca/logo?modo=${modo}` : "/marca/logo", headers });

    it("guarda as duas logos separadas, cada uma com a sua versão e a sua imagem", async () => {
      await apagar();
      await apagar("escuro");
      await enviarLogo("image/png", PNG_1X1);
      const res = await enviarEscura("image/svg+xml", SVG);

      expect(res.statusCode).toBe(200);
      expect(res.json().logoVersao).toEqual(expect.any(Number));
      expect(res.json().logoEscuraVersao).toEqual(expect.any(Number));

      const claro = await app.inject({ method: "GET", url: "/marca/logo" });
      const escuro = await app.inject({ method: "GET", url: "/marca/logo?modo=escuro" });
      expect(claro.headers["content-type"]).toBe("image/png");
      expect(escuro.headers["content-type"]).toBe("image/svg+xml");
      expect(escuro.headers["content-security-policy"]).toContain("sandbox");
    });

    it("remover uma não mexe na outra", async () => {
      await enviarLogo("image/png", PNG_1X1);
      await enviarEscura("image/png", PNG_1X1);

      const semEscura = await apagar("escuro");
      expect(semEscura.json().logoEscuraVersao).toBeNull();
      expect(semEscura.json().logoVersao).toEqual(expect.any(Number));
      expect((await app.inject({ method: "GET", url: "/marca/logo?modo=escuro" })).statusCode).toBe(404);
      expect((await app.inject({ method: "GET", url: "/marca/logo" })).statusCode).toBe(200);

      await enviarEscura("image/png", PNG_1X1);
      const semClara = await apagar();
      expect(semClara.json().logoVersao).toBeNull();
      expect(semClara.json().logoEscuraVersao).toEqual(expect.any(Number));
    });

    it("a logo escura passa pelas mesmas validações e o modo precisa ser válido", async () => {
      expect((await enviarEscura("image/png", "isto não é um png")).statusCode).toBe(400);
      expect((await enviarEscura("image/svg+xml", "<svg><script>alert(1)</script></svg>")).statusCode).toBe(400);
      expect((await put("/marca/logo", { modo: "roxo", tipo: "image/png", dados: PNG_1X1.toString("base64") })).statusCode).toBe(400);
      expect((await app.inject({ method: "GET", url: "/marca/logo?modo=roxo" })).statusCode).toBe(400);
    });

    it("exige autenticação para enviar e remover", async () => {
      expect((await put("/marca/logo", { modo: "escuro", tipo: "image/png", dados: "AAAA" }, false)).statusCode).toBe(401);
      expect((await app.inject({ method: "DELETE", url: "/marca/logo?modo=escuro" })).statusCode).toBe(401);
    });
  });

  it("recusa arquivos que não são o que dizem ser, tipos não permitidos e arquivos grandes", async () => {
    expect((await enviarLogo("image/png", "isto não é um png")).statusCode).toBe(400);
    expect((await enviarLogo("image/svg+xml", "<html>não é svg</html>")).statusCode).toBe(400);
    expect((await enviarLogo("image/gif", PNG_1X1)).statusCode).toBe(400);
    expect((await enviarLogo("image/png", Buffer.concat([PNG_1X1, Buffer.alloc(301 * 1024)]))).statusCode).toBe(400);
  });

  it("recusa SVG com script, eventos ou conteúdo externo", () => {
    const perigosos = [
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><rect/></a></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div/></foreignObject></svg>',
    ];
    for (const svg of perigosos) expect(() => validarLogo("image/svg+xml", Buffer.from(svg))).toThrow();
    expect(() => validarLogo("image/svg+xml", Buffer.from(SVG))).not.toThrow();
  });
});
