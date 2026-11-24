import { z } from "zod";
import { TIPOS_FOTO } from "../lib/foto.js";

// Preço em reais com no máximo 2 casas decimais (ex.: 12, 12.5, 12.00), maior que zero.
const preco = z
  .number()
  .gt(0, "O preço deve ser maior que zero.")
  .max(1000, "O preço deve ser de no máximo R$ 1.000,00.")
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, "Use no máximo 2 casas decimais.");

const nome = z.string().trim().min(2, "O nome deve ter ao menos 2 caracteres.").max(80, "O nome deve ter no máximo 80 caracteres.");

export const bebidaRespostaSchema = z.object({
  id: z.number(),
  nome: z.string(),
  // "12.00": o front formata com R$.
  preco: z.string(),
  ativo: z.boolean(),
  // Versão da foto (use em /bebidas/:id/foto?v=...) ou nulo quando não há foto.
  fotoVersao: z.number().nullable(),
});

export const bebidasAdminRespostaSchema = z.object({
  vendaAtiva: z.boolean(),
  bebidas: z.array(bebidaRespostaSchema),
});

export const vendaBebidasRespostaSchema = z.object({ vendaAtiva: z.boolean() });

export const criarBebidaSchema = z.object({ nome, preco });

export const atualizarBebidaSchema = z
  .object({ nome: nome.optional(), preco: preco.optional(), ativo: z.boolean().optional() })
  .refine((b) => b.nome !== undefined || b.preco !== undefined || b.ativo !== undefined, {
    message: "Informe ao menos um campo para alterar.",
  });

export const atualizarVendaBebidasSchema = z.object({ ativa: z.boolean() });

export const enviarFotoSchema = z.object({
  tipo: z.enum(TIPOS_FOTO),
  // Conteúdo do arquivo em base64 (sem o prefixo "data:...").
  dados: z.string().min(1).max(600_000),
});

export const idBebidaSchema = z.object({ id: z.coerce.number().int().positive() });
