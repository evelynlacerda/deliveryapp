import type { TipoChavePix } from "../generated/prisma/enums.js";
import { ConflitoError, NaoEncontradoError, codigoErroPrisma } from "../lib/errors.js";
import { env } from "../lib/env.js";
import {
  PIX_BANCO_DEMO,
  PIX_CHAVE_DEMO,
  PIX_CHAVE_PADRAO,
  PIX_TITULAR_DEMO,
  WHATSAPP_DEMO,
  chaveParaCopiar,
} from "../lib/pix.js";
import { prisma } from "../lib/prisma.js";
import {
  LIMITE_TABELA,
  PASSO_QUANTIDADE,
  QUANTIDADE_MAXIMA,
  QUANTIDADE_MINIMA,
} from "./preco.js";

const emReais = (centavos: number) => (centavos / 100).toFixed(2);
const paraDecimal = (reais: number) => emReais(Math.round(reais * 100));

export function obterConfiguracao() {
  return prisma.configuracao.findUniqueOrThrow({ where: { id: 1 } });
}

export function listarSabores() {
  return prisma.sabor.findMany({
    where: { ativo: true },
    orderBy: { id: "asc" },
    select: { id: true, nome: true },
  });
}

export function listarTodosSabores() {
  return prisma.sabor.findMany({
    orderBy: { id: "asc" },
    select: { id: true, nome: true, ativo: true },
  });
}

export async function obterValores() {
  const [faixas, config] = await Promise.all([
    prisma.faixaPreco.findMany({ orderBy: { quantidade: "asc" } }),
    obterConfiguracao(),
  ]);

  return {
    faixas: faixas.map((f) => ({ quantidade: f.quantidade, valor: f.valor.toFixed(2) })),
    acimaDe: {
      quantidade: LIMITE_TABELA,
      valorPorUnidade: config.valorUnidadeAcimaDe100.toFixed(2),
    },
    quantidadeMinima: QUANTIDADE_MINIMA,
    quantidadeMaxima: QUANTIDADE_MAXIMA,
    passo: PASSO_QUANTIDADE,
  };
}

export async function obterTempoPreparo() {
  const config = await obterConfiguracao();
  return { minimoMin: config.tempoPreparoMinimoMin, maximoMin: config.tempoPreparoMaximoMin };
}

export async function obterTaxasEntrega() {
  const config = await obterConfiguracao();
  return {
    taxaAte49: config.taxaEntregaAte49.toFixed(2),
    taxaDe50a199: config.taxaEntregaDe50a199.toFixed(2),
    entregaGratisAPartirDe: config.entregaGratisAPartirDe,
  };
}

export async function obterPix() {
  const config = await obterConfiguracao();
  // Bloqueado (demo): a chave é sempre a fictícia, qualquer que seja o valor guardado no banco.
  const tipo = env.MODO_DEMO ? ("CPF" as const) : config.tipoChavePix;
  const chave = env.MODO_DEMO ? PIX_CHAVE_DEMO : config.chavePix;
  return {
    tipo,
    chave,
    chaveParaCopiar: chaveParaCopiar(tipo, chave),
    configurada: chave !== PIX_CHAVE_PADRAO,
    bloqueada: env.MODO_DEMO,
    titular: env.MODO_DEMO ? PIX_TITULAR_DEMO : config.titularPix,
    banco: env.MODO_DEMO ? PIX_BANCO_DEMO : config.bancoPix,
    whatsapp: env.MODO_DEMO ? WHATSAPP_DEMO : config.whatsappEstabelecimento,
    antecedencia: {
      ateLimiteHoras: config.pixAntecedenciaAteLimiteHoras,
      acimaLimiteHoras: config.pixAntecedenciaAcimaLimiteHoras,
      limiteUnidades: LIMITE_TABELA,
    },
  };
}

// Edições do admin
export async function atualizarTempoPreparo(dados: { minimoMin: number; maximoMin: number }) {
  await prisma.configuracao.update({
    where: { id: 1 },
    data: { tempoPreparoMinimoMin: dados.minimoMin, tempoPreparoMaximoMin: dados.maximoMin },
  });
  return obterTempoPreparo();
}

export async function atualizarTaxasEntrega(dados: { taxaAte49: number; taxaDe50a199: number }) {
  await prisma.configuracao.update({
    where: { id: 1 },
    data: {
      taxaEntregaAte49: paraDecimal(dados.taxaAte49),
      taxaEntregaDe50a199: paraDecimal(dados.taxaDe50a199),
    },
  });
  return obterTaxasEntrega();
}

export async function atualizarPix(dados: {
  tipo: TipoChavePix;
  chave: string;
  titular?: string | null;
  banco?: string | null;
  whatsapp?: string | null;
  antecedenciaAteLimiteHoras?: number;
  antecedenciaAcimaLimiteHoras?: number;
}) {
  await prisma.configuracao.update({
    where: { id: 1 },
    data: {
      // Demo: tipo, chave, favorecido, banco e WhatsApp não mudam; só os prazos do Pix são editáveis.
      ...(!env.MODO_DEMO && { tipoChavePix: dados.tipo, chavePix: dados.chave }),
      ...(!env.MODO_DEMO && dados.titular !== undefined && { titularPix: dados.titular }),
      ...(!env.MODO_DEMO && dados.banco !== undefined && { bancoPix: dados.banco }),
      ...(!env.MODO_DEMO && dados.whatsapp !== undefined && { whatsappEstabelecimento: dados.whatsapp }),
      ...(dados.antecedenciaAteLimiteHoras !== undefined && {
        pixAntecedenciaAteLimiteHoras: dados.antecedenciaAteLimiteHoras,
      }),
      ...(dados.antecedenciaAcimaLimiteHoras !== undefined && {
        pixAntecedenciaAcimaLimiteHoras: dados.antecedenciaAcimaLimiteHoras,
      }),
    },
  });
  return obterPix();
}

export async function atualizarValores(dados: {
  faixas: { quantidade: number; valor: number }[];
  valorUnidadeAcimaDe100: number;
}) {
  await prisma.$transaction([
    ...dados.faixas.map((f) =>
      prisma.faixaPreco.update({
        where: { quantidade: f.quantidade },
        data: { valor: paraDecimal(f.valor) },
      }),
    ),
    prisma.configuracao.update({
      where: { id: 1 },
      data: { valorUnidadeAcimaDe100: paraDecimal(dados.valorUnidadeAcimaDe100) },
    }),
  ]);
  return obterValores();
}

export async function criarSabor(nome: string) {
  try {
    return await prisma.sabor.create({
      data: { nome },
      select: { id: true, nome: true, ativo: true },
    });
  } catch (err) {
    if (codigoErroPrisma(err) === "P2002") throw new ConflitoError("Já existe um sabor com esse nome.");
    throw err;
  }
}

// Sabores não são apagados (pedidos antigos os referenciam): "remover" é desativar.
export async function atualizarSabor(id: number, dados: { nome?: string; ativo?: boolean }) {
  try {
    return await prisma.sabor.update({
      where: { id },
      data: dados,
      select: { id: true, nome: true, ativo: true },
    });
  } catch (err) {
    const codigo = codigoErroPrisma(err);
    if (codigo === "P2025") throw new NaoEncontradoError("Sabor não encontrado.");
    if (codigo === "P2002") throw new ConflitoError("Já existe um sabor com esse nome.");
    throw err;
  }
}
