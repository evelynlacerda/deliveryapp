import type { Prisma } from "../generated/prisma/client.js";
import { NaoEncontradoError, codigoErroPrisma } from "../lib/errors.js";
import { validarFoto, type TipoFoto } from "../lib/foto.js";
import { prisma } from "../lib/prisma.js";
import { obterConfiguracao } from "./catalogo.js";

// Nunca seleciona os bytes da foto nas listagens: só a data, que vira a "versão" da imagem.
const selecao = { id: true, nome: true, preco: true, ativo: true, fotoAtualizadaEm: true } as const;

type BebidaDb = Prisma.BebidaGetPayload<{ select: typeof selecao }>;

const formatar = (b: BebidaDb) => ({
  id: b.id,
  nome: b.nome,
  preco: b.preco.toFixed(2),
  ativo: b.ativo,
  fotoVersao: b.fotoAtualizadaEm ? b.fotoAtualizadaEm.getTime() : null,
});

// Arredonda para centavos antes de gravar (evita 12.499999 vindo de ponto flutuante).
const paraDecimal = (reais: number) => (Math.round(reais * 100) / 100).toFixed(2);

// Trata "não encontrado" (P2025) das operações por id.
async function porId<T>(operacao: () => Promise<T>): Promise<T> {
  try {
    return await operacao();
  } catch (err) {
    if (codigoErroPrisma(err) === "P2025") throw new NaoEncontradoError("Bebida não encontrada.");
    throw err;
  }
}

export async function listarBebidasAdmin() {
  const [config, bebidas] = await Promise.all([
    obterConfiguracao(),
    prisma.bebida.findMany({ orderBy: { id: "asc" }, select: selecao }),
  ]);
  return { vendaAtiva: config.vendaBebidasAtiva, bebidas: bebidas.map(formatar) };
}

// O que o cliente vê: nada quando a venda está desligada; senão, só as bebidas ativas.
export async function listarBebidasDisponiveis() {
  const config = await obterConfiguracao();
  if (!config.vendaBebidasAtiva) return [];
  const bebidas = await prisma.bebida.findMany({ where: { ativo: true }, orderBy: { id: "asc" }, select: selecao });
  return bebidas.map(formatar);
}

export async function atualizarVendaBebidas(ativa: boolean) {
  await prisma.configuracao.update({ where: { id: 1 }, data: { vendaBebidasAtiva: ativa } });
  return { vendaAtiva: ativa };
}

export async function criarBebida(dados: { nome: string; preco: number }) {
  const bebida = await prisma.bebida.create({
    data: { nome: dados.nome, preco: paraDecimal(dados.preco) },
    select: selecao,
  });
  return formatar(bebida);
}

export function atualizarBebida(id: number, dados: { nome?: string; preco?: number; ativo?: boolean }) {
  return porId(async () =>
    formatar(
      await prisma.bebida.update({
        where: { id },
        data: {
          ...(dados.nome !== undefined && { nome: dados.nome }),
          ...(dados.preco !== undefined && { preco: paraDecimal(dados.preco) }),
          ...(dados.ativo !== undefined && { ativo: dados.ativo }),
        },
        select: selecao,
      }),
    ),
  );
}

// Nenhum pedido referencia bebidas ainda, então excluir é definitivo.
export function excluirBebida(id: number) {
  return porId(() => prisma.bebida.delete({ where: { id }, select: { id: true } }));
}

export function salvarFoto(id: number, tipo: TipoFoto, base64: string) {
  const dados = Buffer.from(base64, "base64");
  validarFoto(tipo, dados);

  return porId(async () =>
    formatar(
      await prisma.bebida.update({
        where: { id },
        data: { fotoDados: dados, fotoTipo: tipo, fotoAtualizadaEm: new Date() },
        select: selecao,
      }),
    ),
  );
}

export function removerFoto(id: number) {
  return porId(async () =>
    formatar(
      await prisma.bebida.update({
        where: { id },
        data: { fotoDados: null, fotoTipo: null, fotoAtualizadaEm: null },
        select: selecao,
      }),
    ),
  );
}

export async function obterFoto(id: number) {
  const bebida = await prisma.bebida.findUnique({
    where: { id },
    select: { fotoDados: true, fotoTipo: true },
  });
  if (!bebida?.fotoDados || !bebida.fotoTipo) return null;
  return { tipo: bebida.fotoTipo, dados: Buffer.from(bebida.fotoDados) };
}
