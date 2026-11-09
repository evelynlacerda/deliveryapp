import { Prisma } from "../generated/prisma/client.js";
import { env } from "../lib/env.js";
import { validarLogo, type TipoLogo } from "../lib/logo.js";
import { NOME_DEMO } from "../lib/pix.js";
import { prisma } from "../lib/prisma.js";
import { coresSchema, type ModoLogo } from "../schemas/marca.js";
import { obterConfiguracao } from "./catalogo.js";

export async function obterMarca() {
  const config = await obterConfiguracao();
  // O que está salvo passa de novo pelo schema: nunca devolvemos algo fora do formato esperado.
  const cores = config.cores ? coresSchema.safeParse(config.cores) : null;

  return {
    nome: env.MODO_DEMO ? NOME_DEMO : config.nomeMarca,
    nomeBloqueado: env.MODO_DEMO,
    logoVersao: config.logoDados && config.logoAtualizadaEm ? config.logoAtualizadaEm.getTime() : null,
    logoEscuraVersao: config.logoEscuraDados && config.logoEscuraAtualizadaEm ? config.logoEscuraAtualizadaEm.getTime() : null,
    cores: cores?.success ? cores.data : null,
  };
}

export async function obterLogo(modo: ModoLogo = "claro") {
  const config = await obterConfiguracao();
  const dados = modo === "escuro" ? config.logoEscuraDados : config.logoDados;
  const tipo = modo === "escuro" ? config.logoEscuraTipo : config.logoTipo;
  if (!dados || !tipo) return null;
  return { tipo, dados: Buffer.from(dados) };
}

export async function atualizarMarca(dados: { nome: string; cores: unknown }) {
  await prisma.configuracao.update({
    where: { id: 1 },
    data: { ...(!env.MODO_DEMO && { nomeMarca: dados.nome }), cores: dados.cores === null ? Prisma.DbNull : (dados.cores as Prisma.InputJsonValue) },
  });
  return obterMarca();
}

export async function salvarLogo(modo: ModoLogo, tipo: TipoLogo, base64: string) {
  const dados = Buffer.from(base64, "base64");
  validarLogo(tipo, dados);

  await prisma.configuracao.update({
    where: { id: 1 },
    data:
      modo === "escuro"
        ? { logoEscuraDados: dados, logoEscuraTipo: tipo, logoEscuraAtualizadaEm: new Date() }
        : { logoDados: dados, logoTipo: tipo, logoAtualizadaEm: new Date() },
  });
  return obterMarca();
}

export async function removerLogo(modo: ModoLogo) {
  await prisma.configuracao.update({
    where: { id: 1 },
    data:
      modo === "escuro"
        ? { logoEscuraDados: null, logoEscuraTipo: null, logoEscuraAtualizadaEm: null }
        : { logoDados: null, logoTipo: null, logoAtualizadaEm: null },
  });
  return obterMarca();
}
