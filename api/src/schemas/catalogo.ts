import { z } from "zod";
import { TipoChavePix } from "../generated/prisma/enums.js";
import { normalizarChavePix } from "../lib/pix.js";
import { LIMITE_TABELA, PASSO_QUANTIDADE } from "../services/preco.js";

const NOME_DO_TIPO: Record<TipoChavePix, string> = {
  CPF: "CPF",
  CNPJ: "CNPJ",
  TELEFONE: "telefone com DDD",
  ALEATORIA: "chave aleatória (formato UUID)",
};

export const saborRespostaSchema = z.object({ id: z.number(), nome: z.string() });
export const saborAdminRespostaSchema = saborRespostaSchema.extend({ ativo: z.boolean() });

export const valoresRespostaSchema = z.object({
  faixas: z.array(z.object({ quantidade: z.number(), valor: z.string() })),
  acimaDe: z.object({ quantidade: z.number(), valorPorUnidade: z.string() }),
  quantidadeMinima: z.number(),
  quantidadeMaxima: z.number(),
  passo: z.number(),
});

export const tempoPreparoRespostaSchema = z.object({ minimoMin: z.number(), maximoMin: z.number() });

export const taxasEntregaRespostaSchema = z.object({
  taxaAte49: z.string(),
  taxaDe50a199: z.string(),
  entregaGratisAPartirDe: z.number(),
});

export const pixRespostaSchema = z.object({
  tipo: z.enum(TipoChavePix),
  chave: z.string(),
  chaveParaCopiar: z.string(),
  configurada: z.boolean(),
  bloqueada: z.boolean(),
  titular: z.string().nullable(),
  banco: z.string().nullable(),
  whatsapp: z.string().nullable(),
  antecedencia: z.object({
    ateLimiteHoras: z.number(),
    acimaLimiteHoras: z.number(),
    limiteUnidades: z.number(),
  }),
});

export const funcionamentoRespostaSchema = z.object({
  horarioAbertura: z.string().nullable(),
  horarioFechamento: z.string().nullable(),
  diasAtendimento: z.array(z.number().int().min(0).max(6)),
  enderecoRetirada: z.string().nullable(),
  estabelecimentoFechado: z.boolean(),
  aberto: z.boolean(),
  motivoFechado: z.enum(["FECHADO_MANUAL", "FORA_DO_HORARIO"]).nullable(),
  entregaHoje: z.boolean(),
});

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .optional();

// WhatsApp com DDD (aceita +55, máscara e espaços). Vazio apaga.
const whatsappSchema = z
  .string()
  .trim()
  .max(30)
  .transform((v) => {
    const digitos = v.replace(/\D/g, "");
    return digitos.length >= 12 && digitos.startsWith("55") ? digitos.slice(2) : digitos;
  })
  .pipe(z.string().regex(/^(\d{10,11})?$/, "Informe o WhatsApp com DDD."))
  .transform((v) => (v === "" ? null : v))
  .optional();

const horasAntecedencia = z.number().int().min(0).max(168).optional();

export const atualizarPixSchema = z
  .object({
    tipo: z.enum(TipoChavePix),
    chave: z.string().trim().min(1).max(100),
    titular: textoOpcional(80),
    banco: textoOpcional(80),
    whatsapp: whatsappSchema,
    antecedenciaAteLimiteHoras: horasAntecedencia,
    antecedenciaAcimaLimiteHoras: horasAntecedencia,
  })
  .superRefine((pix, ctx) => {
    if (normalizarChavePix(pix.tipo, pix.chave) === null) {
      ctx.addIssue({
        code: "custom",
        path: ["chave"],
        message: `A chave informada não é um(a) ${NOME_DO_TIPO[pix.tipo]} válido(a).`,
      });
    }
  })
  .transform((pix) => ({ ...pix, chave: normalizarChavePix(pix.tipo, pix.chave)! }));

// Valor em reais com no máximo 2 casas decimais (ex.: 7, 7.5, 7.00).
const valorEmReais = (max: number) =>
  z
    .number()
    .min(0)
    .max(max)
    .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, "Use no máximo 2 casas decimais.");

export const atualizarTempoPreparoSchema = z
  .object({
    minimoMin: z.number().int().min(1).max(1440),
    maximoMin: z.number().int().min(1).max(1440),
  })
  .refine((t) => t.maximoMin >= t.minimoMin, {
    path: ["maximoMin"],
    message: "O tempo máximo não pode ser menor que o mínimo.",
  });

export const atualizarTaxasEntregaSchema = z.object({
  taxaAte49: valorEmReais(1000),
  taxaDe50a199: valorEmReais(1000),
});

const horario = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use o formato HH:MM (ex.: 08:00).");

export const atualizarFuncionamentoSchema = z
  .object({
    horarioAbertura: horario.nullable(),
    horarioFechamento: horario.nullable(),
    estabelecimentoFechado: z.boolean(),
    entregaHoje: z.boolean(),
    diasAtendimento: z
      .array(z.number().int().min(0).max(6))
      .min(1, "Selecione ao menos um dia de atendimento.")
      .max(7)
      .optional(),
  })
  .superRefine((f, ctx) => {
    if ((f.horarioAbertura === null) !== (f.horarioFechamento === null)) {
      ctx.addIssue({
        code: "custom",
        path: [f.horarioAbertura === null ? "horarioAbertura" : "horarioFechamento"],
        message: "Informe a abertura e o fechamento, ou deixe os dois vazios.",
      });
    } else if (f.horarioAbertura !== null && f.horarioAbertura === f.horarioFechamento) {
      ctx.addIssue({
        code: "custom",
        path: ["horarioFechamento"],
        message: "O fechamento deve ser diferente da abertura.",
      });
    }
  });

export const atualizarEnderecoRetiradaSchema = z.object({
  enderecoRetirada: z
    .string()
    .trim()
    .max(300, "O endereço deve ter no máximo 300 caracteres.")
    .transform((v) => (v === "" ? null : v)),
});

export const criarSaborSchema = z.object({ nome: z.string().trim().min(2).max(80) });

export const atualizarSaborSchema = z
  .object({ nome: z.string().trim().min(2).max(80).optional(), ativo: z.boolean().optional() })
  .refine((s) => s.nome !== undefined || s.ativo !== undefined, {
    message: "Informe o nome e/ou o campo ativo.",
  });

const QUANTIDADES_DA_TABELA = Array.from(
  { length: LIMITE_TABELA / PASSO_QUANTIDADE },
  (_, i) => (i + 1) * PASSO_QUANTIDADE,
);

// A tabela completa (10, 20, ..., 100) é enviada de uma vez, para nunca ficar uma faixa sem preço.
export const atualizarValoresSchema = z.object({
  faixas: z
    .array(z.object({ quantidade: z.number().int(), valor: valorEmReais(100000).refine((v) => v > 0, "O valor deve ser maior que zero.") }))
    .refine(
      (faixas) => {
        const enviadas = faixas.map((f) => f.quantidade).sort((a, b) => a - b);
        return (
          enviadas.length === QUANTIDADES_DA_TABELA.length &&
          enviadas.every((q, i) => q === QUANTIDADES_DA_TABELA[i])
        );
      },
      `Envie exatamente as faixas: ${QUANTIDADES_DA_TABELA.join(", ")}.`,
    ),
  valorUnidadeAcimaDe100: valorEmReais(1000).refine((v) => v > 0, "O valor deve ser maior que zero."),
});
