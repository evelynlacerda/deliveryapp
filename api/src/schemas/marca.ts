import { z } from "zod";
import { TIPOS_LOGO } from "../lib/logo.js";

const corEntrada = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use uma cor no formato #RRGGBB.")
  .transform((v) => v.toLowerCase());
const corSaida = z.string();

// Cores editáveis de um tema (claro ou escuro). Ausente = usa o padrão do app.
function criarCoresSchema<C extends z.ZodType<string>>(cor: C) {
  const paleta = z.object({
    fundo: cor.optional(),
    texto: cor.optional(),
    cartao: cor.optional(),
    primaria: cor.optional(),
    destaque: cor.optional(),
    textoSecundario: cor.optional(),
    borda: cor.optional(),
  });
  const paletaAdmin = paleta.extend({ barraLateral: cor.optional() });

  return z.object({
    publico: z.object({ claro: paleta.optional(), escuro: paleta.optional() }).optional(),
    admin: z.object({ claro: paletaAdmin.optional(), escuro: paletaAdmin.optional() }).optional(),
  });
}

export const coresSchema = criarCoresSchema(corEntrada);
const coresRespostaSchema = criarCoresSchema(corSaida);

export const MODOS_LOGO = ["claro", "escuro"] as const;
export const modoLogoSchema = z.enum(MODOS_LOGO).default("claro");
export type ModoLogo = (typeof MODOS_LOGO)[number];

export const marcaRespostaSchema = z.object({
  nome: z.string(),
  // true na demonstração: o nome é fixo e o PUT /admin/marca ignora o campo nome.
  nomeBloqueado: z.boolean(),
  // Versão da logo (use em /marca/logo?v=...) ou nulo quando não há logo.
  logoVersao: z.number().nullable(),
  // Logo do modo escuro (opcional). Nulo = o modo escuro usa a logo normal.
  logoEscuraVersao: z.number().nullable(),
  cores: coresRespostaSchema.nullable(),
});

export const atualizarMarcaSchema = z.object({
  nome: z.string().trim().min(2, "O nome deve ter ao menos 2 caracteres.").max(60, "O nome deve ter no máximo 60 caracteres."),
  cores: coresSchema.nullable(),
});

export const logoQuerySchema = z.object({ modo: modoLogoSchema });

export const enviarLogoSchema = z.object({
  modo: modoLogoSchema,
  tipo: z.enum(TIPOS_LOGO),
  dados: z.string().min(1).max(600_000),
});
