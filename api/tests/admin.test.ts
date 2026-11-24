import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { autenticar, criarApp, criarPedidoDireto, encerrar, obterPrisma, salvarConfiguracao } from "./helpers.js";
import { ADMIN_TESTE } from "./test-env.js";

const NOME_SABOR = "Sabor de Teste Admin";
const NOME_BEBIDA = "Bebida de Teste Admin";
// PNG mínimo (1x1) em base64.
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const CPF_VALIDO = "529.982.247-25";

let app: FastifyInstance;
let headers: { authorization: string };
let restaurarConfiguracao: () => Promise<void>;
const codigosCriados: string[] = [];

const get = (url: string) => app.inject({ method: "GET", url, headers });
const put = (url: string, payload: unknown) => app.inject({ method: "PUT", url, payload: payload as object, headers });

async function novoPedido(quantidade: number, tipoEntrega: "ENTREGA" | "RETIRADA") {
  const pedido = await criarPedidoDireto({ quantidade, tipoEntrega });
  codigosCriados.push(pedido.codigo);
  return pedido;
}

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
  await prisma.bebida.deleteMany({ where: { nome: { startsWith: NOME_BEBIDA } } });
  await encerrar(app);
});

describe("proteção das rotas do admin", () => {
  const rotas = [
    { method: "GET", url: "/pedidos" },
    { method: "PUT", url: "/pedido/ABCD2345/status", payload: { status: "EM_PRODUCAO" } },
    { method: "PUT", url: "/tempo-preparo", payload: { minimoMin: 30, maximoMin: 60 } },
    { method: "PUT", url: "/taxa-entrega", payload: { taxaAte49: 7, taxaDe50a199: 5 } },
    { method: "PUT", url: "/pix", payload: { tipo: "CPF", chave: CPF_VALIDO } },
    { method: "PUT", url: "/valores", payload: {} },
    { method: "GET", url: "/admin/sabores" },
    { method: "POST", url: "/sabores", payload: { nome: NOME_SABOR } },
    { method: "PATCH", url: "/sabores/1", payload: { ativo: false } },
    { method: "GET", url: "/admin/bebidas" },
    { method: "PUT", url: "/bebidas/venda", payload: { ativa: false } },
    { method: "POST", url: "/bebidas", payload: { nome: NOME_BEBIDA, preco: 5 } },
    { method: "PATCH", url: "/bebidas/1", payload: { ativo: false } },
    { method: "DELETE", url: "/bebidas/1" },
    { method: "PUT", url: "/bebidas/1/foto", payload: { tipo: "image/png", dados: PNG } },
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

describe("GET /pedidos", () => {
  it("lista os pedidos, mais recentes primeiro, com o telefone do cliente", async () => {
    const antigo = await novoPedido(20, "RETIRADA");
    const recente = await novoPedido(30, "ENTREGA");

    const res = await get("/pedidos?status=AGUARDANDO");
    const codigos = res.json().map((p: { codigo: string }) => p.codigo);

    expect(res.statusCode).toBe(200);
    expect(codigos.indexOf(recente.codigo)).toBeLessThan(codigos.indexOf(antigo.codigo));
    expect(res.json().find((p: { codigo: string }) => p.codigo === antigo.codigo)).toMatchObject({
      telefone: "11912345678",
      tipoEntrega: "RETIRADA",
    });
  });

  it("filtra por status", async () => {
    const pedido = await novoPedido(10, "RETIRADA");
    await put(`/pedido/${pedido.codigo}/status`, { status: "EM_PRODUCAO" });

    const emProducao = (await get("/pedidos?status=EM_PRODUCAO")).json();
    const aguardando = (await get("/pedidos?status=AGUARDANDO")).json();

    expect(emProducao.map((p: { codigo: string }) => p.codigo)).toContain(pedido.codigo);
    expect(aguardando.map((p: { codigo: string }) => p.codigo)).not.toContain(pedido.codigo);
  });

  it("filtra por data (horário de Brasília)", async () => {
    const pedido = await novoPedido(10, "RETIRADA");
    const dia = (deslocamentoDias: number) =>
      new Date(Date.now() - 3 * 3600_000 + deslocamentoDias * 86_400_000).toISOString().slice(0, 10);
    const codigosDe = async (query: string) =>
      (await get(`/pedidos?${query}`)).json().map((p: { codigo: string }) => p.codigo);

    expect(await codigosDe(`de=${dia(0)}&ate=${dia(0)}`)).toContain(pedido.codigo);
    expect(await codigosDe(`de=${dia(1)}`)).not.toContain(pedido.codigo);
    expect(await codigosDe(`ate=${dia(-1)}`)).not.toContain(pedido.codigo);
  });

  it("rejeita status e datas inválidos", async () => {
    expect((await get("/pedidos?status=XYZ")).statusCode).toBe(400);
    expect((await get("/pedidos?de=ontem")).statusCode).toBe(400);
  });
});

describe("PUT /pedido/:codigo/status", () => {
  it("pedido de retirada segue aguardando → em produção → pronto para retirada → finalizado", async () => {
    const pedido = await novoPedido(30, "RETIRADA");

    for (const status of ["EM_PRODUCAO", "PRONTO_RETIRADA", "FINALIZADO"]) {
      const res = await put(`/pedido/${pedido.codigo}/status`, { status });
      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe(status);
    }

    const publico = await app.inject({ method: "GET", url: `/pedido/${pedido.codigo}` });
    expect(publico.json().status).toBe("FINALIZADO");
  });

  it("pedido de entrega segue aguardando → em produção → em rota de entrega → finalizado", async () => {
    const pedido = await novoPedido(50, "ENTREGA");

    for (const status of ["EM_PRODUCAO", "EM_ROTA_ENTREGA", "FINALIZADO"]) {
      const res = await put(`/pedido/${pedido.codigo}/status`, { status });
      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe(status);
    }
  });

  it("retirada não pode ficar 'em rota de entrega'", async () => {
    const pedido = await novoPedido(20, "RETIRADA");
    const res = await put(`/pedido/${pedido.codigo}/status`, { status: "EM_ROTA_ENTREGA" });

    expect(res.statusCode).toBe(400);
    expect(res.json().mensagem).toBe("O status EM_ROTA_ENTREGA não existe para pedidos de retirada.");
  });

  it("entrega não pode ficar 'pronto para retirada'", async () => {
    const pedido = await novoPedido(50, "ENTREGA");
    const res = await put(`/pedido/${pedido.codigo}/status`, { status: "PRONTO_RETIRADA" });

    expect(res.statusCode).toBe(400);
    expect(res.json().mensagem).toBe("O status PRONTO_RETIRADA não existe para pedidos de entrega.");
  });

  it("o admin pode voltar uma etapa para corrigir um engano", async () => {
    const pedido = await novoPedido(20, "RETIRADA");
    await put(`/pedido/${pedido.codigo}/status`, { status: "PRONTO_RETIRADA" });
    const res = await put(`/pedido/${pedido.codigo}/status`, { status: "EM_PRODUCAO" });

    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("EM_PRODUCAO");
  });

  it("pedido inexistente responde 404 e status desconhecido responde 400", async () => {
    expect((await put("/pedido/ZZZZZZZZ/status", { status: "EM_PRODUCAO" })).statusCode).toBe(404);

    const pedido = await novoPedido(10, "RETIRADA");
    expect((await put(`/pedido/${pedido.codigo}/status`, { status: "INVENTADO" })).statusCode).toBe(400);
  });
});

describe("PUT /tempo-preparo", () => {
  it("atualiza e a rota pública reflete", async () => {
    const res = await put("/tempo-preparo", { minimoMin: 45, maximoMin: 90 });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ minimoMin: 45, maximoMin: 90 });
    expect((await app.inject({ method: "GET", url: "/tempo-preparo" })).json()).toEqual({
      minimoMin: 45,
      maximoMin: 90,
    });
  });

  it("rejeita máximo menor que o mínimo", async () => {
    const res = await put("/tempo-preparo", { minimoMin: 90, maximoMin: 45 });

    expect(res.statusCode).toBe(400);
    expect(res.json().erros[0].mensagem).toBe("O tempo máximo não pode ser menor que o mínimo.");
  });

  it.each([{ minimoMin: 0, maximoMin: 10 }, { minimoMin: 10, maximoMin: 1441 }, { minimoMin: 1.5, maximoMin: 10 }])(
    "rejeita valores fora do limite: %j",
    async (corpo) => {
      expect((await put("/tempo-preparo", corpo)).statusCode).toBe(400);
    },
  );
});

describe("PUT /taxa-entrega", () => {
  it("atualiza as duas faixas e os pedidos novos usam as taxas novas", async () => {
    const res = await put("/taxa-entrega", { taxaAte49: 8, taxaDe50a199: 6.5 });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ taxaAte49: "8.00", taxaDe50a199: "6.50", entregaGratisAPartirDe: 200 });

    expect((await novoPedido(10, "ENTREGA")).taxaEntrega.toFixed(2)).toBe("8.00");
    expect((await novoPedido(50, "ENTREGA")).taxaEntrega.toFixed(2)).toBe("6.50");
    expect((await novoPedido(200, "ENTREGA")).taxaEntrega.toFixed(2)).toBe("0.00");
  });

  it("rejeita mais de 2 casas decimais, valor negativo e valor que não é número", async () => {
    const decimais = await put("/taxa-entrega", { taxaAte49: 7.005, taxaDe50a199: 5 });
    expect(decimais.statusCode).toBe(400);
    expect(decimais.json().erros[0].mensagem).toBe("Use no máximo 2 casas decimais.");

    expect((await put("/taxa-entrega", { taxaAte49: -1, taxaDe50a199: 5 })).statusCode).toBe(400);
    expect((await put("/taxa-entrega", { taxaAte49: "sete", taxaDe50a199: 5 })).statusCode).toBe(400);
  });
});

describe("PUT /valores", () => {
  const faixasAtuais = async () =>
    (await app.inject({ method: "GET", url: "/valores" }))
      .json()
      .faixas.map((f: { quantidade: number; valor: string }) => ({ quantidade: f.quantidade, valor: Number(f.valor) }));

  it("atualiza a tabela e o preço por unidade, e os pedidos novos usam os valores novos", async () => {
    const faixas = (await faixasAtuais()).map((f: { quantidade: number; valor: number }) =>
      f.quantidade === 10 ? { ...f, valor: 14 } : f,
    );

    const res = await put("/valores", { faixas, valorUnidadeAcimaDe100: 0.7 });

    expect(res.statusCode).toBe(200);
    expect(res.json().faixas[0]).toEqual({ quantidade: 10, valor: "14.00" });
    expect(res.json().acimaDe.valorPorUnidade).toBe("0.70");

    expect((await novoPedido(10, "RETIRADA")).total.toFixed(2)).toBe("14.00");
    expect((await novoPedido(110, "RETIRADA")).total.toFixed(2)).toBe("77.00");
  });

  it("exige a tabela completa: faltando ou sobrando faixa responde 400", async () => {
    const faixas = await faixasAtuais();

    const faltando = await put("/valores", { faixas: faixas.slice(1), valorUnidadeAcimaDe100: 0.64 });
    expect(faltando.statusCode).toBe(400);
    expect(faltando.json().erros[0].mensagem).toContain("Envie exatamente as faixas");

    const sobrando = await put("/valores", { faixas: [...faixas, { quantidade: 110, valor: 70 }], valorUnidadeAcimaDe100: 0.64 });
    expect(sobrando.statusCode).toBe(400);
  });

  it("rejeita valor zero", async () => {
    const faixas = (await faixasAtuais()).map((f: { quantidade: number; valor: number }) =>
      f.quantidade === 20 ? { ...f, valor: 0 } : f,
    );

    expect((await put("/valores", { faixas, valorUnidadeAcimaDe100: 0.64 })).statusCode).toBe(400);
  });
});

describe("Pix", () => {
  it("salva CPF com máscara, guarda só os dígitos e a rota pública reflete", async () => {
    const res = await put("/pix", { tipo: "CPF", chave: CPF_VALIDO });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      tipo: "CPF",
      chave: "52998224725",
      chaveParaCopiar: "52998224725",
      configurada: true,
    });
    expect((await app.inject({ method: "GET", url: "/pix" })).json()).toEqual(res.json());
  });

  it("telefone: guarda DDD + número e entrega com +55 para copiar", async () => {
    const res = await put("/pix", { tipo: "TELEFONE", chave: "(11) 91234-5678" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ tipo: "TELEFONE", chave: "11912345678", chaveParaCopiar: "+5511912345678" });
  });

  it("aceita CNPJ e chave aleatória (UUID em minúsculas)", async () => {
    const cnpj = await put("/pix", { tipo: "CNPJ", chave: "11.222.333/0001-81" });
    expect(cnpj.json()).toMatchObject({ tipo: "CNPJ", chave: "11222333000181" });

    const aleatoria = await put("/pix", { tipo: "ALEATORIA", chave: "123E4567-E89B-42D3-A456-426614174000" });
    expect(aleatoria.json()).toMatchObject({ tipo: "ALEATORIA", chave: "123e4567-e89b-42d3-a456-426614174000" });
  });

  it("rejeita chave inválida para o tipo informado", async () => {
    const cpfErrado = await put("/pix", { tipo: "CPF", chave: "529.982.247-26" });
    expect(cpfErrado.statusCode).toBe(400);
    expect(cpfErrado.json().erros[0]).toMatchObject({
      campo: "chave",
      mensagem: "A chave informada não é um(a) CPF válido(a).",
    });

    expect((await put("/pix", { tipo: "CNPJ", chave: CPF_VALIDO })).statusCode).toBe(400);
    expect((await put("/pix", { tipo: "EMAIL", chave: "a@b.com" })).statusCode).toBe(400);
  });

  it("a chave rejeitada não altera a que já estava salva", async () => {
    await put("/pix", { tipo: "CPF", chave: CPF_VALIDO });
    await put("/pix", { tipo: "CPF", chave: "11111111111" });

    expect((await app.inject({ method: "GET", url: "/pix" })).json().chave).toBe("52998224725");
  });
});

describe("sabores", () => {
  let saborId: number;

  it("cria um sabor", async () => {
    const res = await app.inject({ method: "POST", url: "/sabores", payload: { nome: NOME_SABOR }, headers });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ nome: NOME_SABOR, ativo: true });
    saborId = res.json().id;
  });

  it("nome repetido responde 409", async () => {
    const res = await app.inject({ method: "POST", url: "/sabores", payload: { nome: NOME_SABOR }, headers });

    expect(res.statusCode).toBe(409);
    expect(res.json().mensagem).toBe("Já existe um sabor com esse nome.");
  });

  it("desativar tira o sabor da lista pública, mas ele continua na lista do admin", async () => {
    const res = await app.inject({ method: "PATCH", url: `/sabores/${saborId}`, payload: { ativo: false }, headers });
    expect(res.statusCode).toBe(200);
    expect(res.json().ativo).toBe(false);

    const publicos = (await app.inject({ method: "GET", url: "/sabores" })).json();
    expect(publicos.map((s: { nome: string }) => s.nome)).not.toContain(NOME_SABOR);

    const todos = (await get("/admin/sabores")).json();
    expect(todos.find((s: { nome: string }) => s.nome === NOME_SABOR)).toMatchObject({ ativo: false });
  });

  it("sabor desativado não pode ser pedido", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/pedido",
      payload: {
        nomeCliente: "Cliente de Teste",
        telefone: "11912345678",
        formaPagamento: "DINHEIRO",
        quantidade: 50,
        tipoEntrega: "ENTREGA",
        endereco: "Rua das Flores", numero: "123", bairro: "Centro",
        sabores: [{ saborId, quantidade: 50 }],
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it("reativar devolve o sabor à lista pública e permite renomear", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/sabores/${saborId}`,
      payload: { ativo: true, nome: NOME_SABOR },
      headers,
    });
    expect(res.statusCode).toBe(200);

    const publicos = (await app.inject({ method: "GET", url: "/sabores" })).json();
    expect(publicos.map((s: { nome: string }) => s.nome)).toContain(NOME_SABOR);
  });

  it("sabor inexistente responde 404 e corpo vazio responde 400", async () => {
    const naoExiste = await app.inject({ method: "PATCH", url: "/sabores/999999", payload: { ativo: true }, headers });
    expect(naoExiste.statusCode).toBe(404);

    const vazio = await app.inject({ method: "PATCH", url: `/sabores/${saborId}`, payload: {}, headers });
    expect(vazio.statusCode).toBe(400);
  });
});

describe("bebidas", () => {
  const chamar = (method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", url: string, payload?: object) =>
    app.inject({ method, url, payload, headers });

  // Amanhã às 12h (Brasília): dentro do atendimento em qualquer hora em que o teste rode.
  const amanhaAoMeioDia = () => {
    const d = new Date(Date.now() + 24 * 3600_000);
    d.setUTCHours(15, 0, 0, 0);
    return d.toISOString();
  };
  const pedir = (extra: object = {}) =>
    app.inject({
      method: "POST",
      url: "/pedido",
      payload: {
        nomeCliente: "Cliente de Teste",
        telefone: "11912345678",
        formaPagamento: "DINHEIRO",
        quantidade: 30,
        tipoEntrega: "RETIRADA",
        horarioAgendado: amanhaAoMeioDia(),
        ...extra,
      },
    });

  it("cria, edita, desativa, recebe foto e exclui; recusa dados inválidos", async () => {
    const criada = await chamar("POST", "/bebidas", { nome: ` ${NOME_BEBIDA} 2L `, preco: 12 });
    expect(criada.statusCode).toBe(201);
    expect(criada.json()).toMatchObject({ nome: `${NOME_BEBIDA} 2L`, preco: "12.00", ativo: true, fotoVersao: null });
    const id = criada.json().id as number;

    expect((await chamar("POST", "/bebidas", { nome: NOME_BEBIDA, preco: 0 })).statusCode).toBe(400);
    expect((await chamar("POST", "/bebidas", { nome: NOME_BEBIDA, preco: 5.555 })).statusCode).toBe(400);

    expect((await chamar("PATCH", `/bebidas/${id}`, { preco: 13.5, ativo: false })).json()).toMatchObject({
      preco: "13.50",
      ativo: false,
    });

    const falsa = Buffer.from("isto nao e um png").toString("base64");
    expect((await chamar("PUT", `/bebidas/${id}/foto`, { tipo: "image/png", dados: falsa })).statusCode).toBe(400);

    const foto = await chamar("PUT", `/bebidas/${id}/foto`, { tipo: "image/png", dados: PNG });
    expect(foto.statusCode).toBe(200);
    // A foto é pública (usada em <img>) e vem como imagem.
    const imagem = await app.inject({ method: "GET", url: `/bebidas/${id}/foto?v=${foto.json().fotoVersao}` });
    expect(imagem.headers["content-type"]).toBe("image/png");
    expect((await chamar("DELETE", `/bebidas/${id}/foto`)).json().fotoVersao).toBeNull();

    expect((await chamar("DELETE", `/bebidas/${id}`)).statusCode).toBe(204);
    expect((await chamar("PATCH", `/bebidas/${id}`, { ativo: true })).statusCode).toBe(404);
  });

  it("a lista pública só tem bebidas ativas, e nenhuma com a venda desligada", async () => {
    const ativa = (await chamar("POST", "/bebidas", { nome: `${NOME_BEBIDA} ativa`, preco: 8 })).json();
    const inativa = (await chamar("POST", "/bebidas", { nome: `${NOME_BEBIDA} inativa`, preco: 9 })).json();
    await chamar("PATCH", `/bebidas/${inativa.id}`, { ativo: false });

    const ids = async () => (await app.inject({ method: "GET", url: "/bebidas" })).json().map((b: { id: number }) => b.id);
    expect(await ids()).toContain(ativa.id);
    expect(await ids()).not.toContain(inativa.id);
    expect((await get("/admin/bebidas")).json().bebidas.map((b: { id: number }) => b.id)).toContain(inativa.id);

    expect((await chamar("PUT", "/bebidas/venda", { ativa: false })).json()).toEqual({ vendaAtiva: false });
    expect(await ids()).toEqual([]);
    // Com a venda desligada o pedido não exige (nem aceita) bebidas.
    const semVenda = await pedir();
    expect(semVenda.statusCode).toBe(201);
    codigosCriados.push(semVenda.json().codigo);
    expect(semVenda.json().bebidas).toEqual([]);
    expect((await pedir({ bebidas: [{ bebidaId: ativa.id, quantidade: 1 }] })).statusCode).toBe(400);
    await chamar("PUT", "/bebidas/venda", { ativa: true });
  });

  it("o pedido exige escolher as bebidas (ou nenhuma) e soma quantidade x valor ao total", async () => {
    const coca = (await chamar("POST", "/bebidas", { nome: `${NOME_BEBIDA} coca`, preco: 12 })).json();
    const guarana = (await chamar("POST", "/bebidas", { nome: `${NOME_BEBIDA} guarana`, preco: 10.5 })).json();

    expect((await pedir()).statusCode).toBe(400);
    expect((await pedir({ bebidas: [{ bebidaId: 999999, quantidade: 1 }] })).statusCode).toBe(400);
    expect((await pedir({ bebidas: [{ bebidaId: coca.id, quantidade: 1 }, { bebidaId: coca.id, quantidade: 2 }] })).statusCode).toBe(400);
    expect((await pedir({ bebidas: [{ bebidaId: coca.id, quantidade: 0 }] })).statusCode).toBe(400);

    const nenhuma = await pedir({ bebidas: [] });
    expect(nenhuma.statusCode).toBe(201);
    codigosCriados.push(nenhuma.json().codigo);
    expect(nenhuma.json()).toMatchObject({ bebidas: [], totalBebidas: "0.00", total: "29.00" });

    // 3 de um sabor e 2 do outro: 3 x 12,00 + 2 x 10,50 = 57,00.
    const comBebidas = await pedir({
      bebidas: [{ bebidaId: coca.id, quantidade: 3 }, { bebidaId: guarana.id, quantidade: 2 }],
    });
    expect(comBebidas.statusCode).toBe(201);
    codigosCriados.push(comBebidas.json().codigo);
    expect(comBebidas.json()).toMatchObject({
      subtotal: "29.00",
      bebidas: [
        { nome: `${NOME_BEBIDA} coca`, quantidade: 3, valorUnitario: "12.00", valor: "36.00" },
        { nome: `${NOME_BEBIDA} guarana`, quantidade: 2, valorUnitario: "10.50", valor: "21.00" },
      ],
      totalBebidas: "57.00",
      total: "86.00",
    });

    // O pedido guarda o nome e o valor da hora: excluir a bebida não o altera.
    await chamar("DELETE", `/bebidas/${coca.id}`);
    const salvo = await app.inject({ method: "GET", url: `/pedido/${comBebidas.json().codigo}` });
    expect(salvo.json().bebidas[0]).toMatchObject({ nome: `${NOME_BEBIDA} coca`, quantidade: 3, valor: "36.00" });
  });
});
