import { z } from "zod";
import { FormaPagamento, StatusPedido, TipoEntrega } from "../generated/prisma/enums.js";
import type { PedidoComItens } from "../services/pedidos.js";
import { PASSO_QUANTIDADE, QUANTIDADE_MAXIMA, QUANTIDADE_MINIMA } from "../services/preco.js";

export const SABOR_MISTO = "Misto";

// Com quantidade: o cliente definiu quantas unidades de cada sabor.
// Sem quantidade: o cliente só escolheu o sabor e a loja divide as unidades.
const itemSaborSchema = z.object({
  saborId: z.number().int().positive(),
  quantidade: z.number().int().positive().optional(),
});

export const criarPedidoSchema = z
  .object({
    nomeCliente: z.string().trim().min(2, "Informe seu nome.").max(120),
    telefone: z
      .string()
      .transform((v) => v.replace(/\D/g, ""))
      .pipe(z.string().regex(/^\d{10,11}$/, "Informe um telefone com DDD.")),
    quantidade: z
      .number()
      .int()
      .min(QUANTIDADE_MINIMA)
      .max(QUANTIDADE_MAXIMA)
      .multipleOf(PASSO_QUANTIDADE, `A quantidade deve ser múltipla de ${PASSO_QUANTIDADE}.`),
    sabores: z.array(itemSaborSchema).max(50).default([]),
    tipoEntrega: z.enum(TipoEntrega),
    endereco: z.string().trim().min(5).max(300).optional(),
    // Opcional (só vale na entrega). Texto vazio é tratado como "não informado".
    pontoReferencia: z
      .string()
      .trim()
      .max(200, "O ponto de referência deve ter no máximo 200 caracteres.")
      .transform((v) => (v === "" ? undefined : v))
      .optional(),
    // Recado opcional para a loja. Texto vazio é tratado como "não informado".
    observacao: z
      .string()
      .trim()
      .max(500, "A observação deve ter no máximo 500 caracteres.")
      .transform((v) => (v === "" ? undefined : v))
      .optional(),
    horarioAgendado: z.iso
      .datetime({ offset: true })
      .transform((v) => new Date(v))
      .optional(),
    formaPagamento: z.enum(FormaPagamento),
    // Só vale com pagamento em dinheiro. trocoPara = valor da nota (em reais), ex.: 100.
    precisaTroco: z.boolean().default(false),
    trocoPara: z.number().positive("Informe um valor de troco válido.").max(100000).optional(),
  })
  .superRefine((pedido, ctx) => {
    if (pedido.formaPagamento === FormaPagamento.DINHEIRO && pedido.precisaTroco && !pedido.trocoPara) {
      ctx.addIssue({ code: "custom", path: ["trocoPara"], message: "Informe para quanto você precisa de troco." });
    }

    if (pedido.tipoEntrega === TipoEntrega.ENTREGA && !pedido.endereco) {
      ctx.addIssue({ code: "custom", path: ["endereco"], message: "Informe o endereço de entrega." });
    }

    if (pedido.horarioAgendado && pedido.horarioAgendado.getTime() <= Date.now()) {
      ctx.addIssue({
        code: "custom",
        path: ["horarioAgendado"],
        message: "O horário escolhido deve ser no futuro.",
      });
    }

    if (pedido.sabores.length > 0) {
      const ids = pedido.sabores.map((s) => s.saborId);
      if (new Set(ids).size !== ids.length) {
        ctx.addIssue({ code: "custom", path: ["sabores"], message: "Sabor repetido no pedido." });
      }

      const comQuantidade = pedido.sabores.filter((s) => s.quantidade !== undefined).length;

      if (comQuantidade > 0 && comQuantidade < pedido.sabores.length) {
        ctx.addIssue({
          code: "custom",
          path: ["sabores"],
          message: "Informe a quantidade de todos os sabores ou de nenhum.",
        });
      } else if (comQuantidade > 0) {
        const soma = pedido.sabores.reduce((acc, s) => acc + (s.quantidade ?? 0), 0);
        if (soma !== pedido.quantidade) {
          ctx.addIssue({
            code: "custom",
            path: ["sabores"],
            message: `A soma dos sabores (${soma}) deve ser igual à quantidade do pedido (${pedido.quantidade}).`,
          });
        }
      }
    }
  });

export type CriarPedidoInput = z.infer<typeof criarPedidoSchema>;

export const pedidoRespostaSchema = z.object({
  codigo: z.string(),
  status: z.enum(StatusPedido),
  nomeCliente: z.string(),
  tipoEntrega: z.enum(TipoEntrega),
  endereco: z.string().nullable(),
  pontoReferencia: z.string().nullable(),
  observacao: z.string().nullable(),
  // Retirada: onde buscar (endereço do estabelecimento na hora do pedido). null se não configurado ou se for entrega.
  enderecoRetirada: z.string().nullable(),
  horarioAgendado: z.string().nullable(),
  tempoPreparoMin: z.number().nullable(),
  previsaoEm: z.string().nullable(),
  formaPagamento: z.enum(FormaPagamento),
  troco: z.object({ precisa: z.boolean(), para: z.string().nullable() }).nullable(),
  instrucaoPix: z
    .object({
      imediato: z.boolean(),
      horasAntecedencia: z.number().nullable(),
      pagarAte: z.string().nullable(),
    })
    .nullable(),
  quantidadeTotal: z.number(),
  subtotal: z.string(),
  taxaEntrega: z.string(),
  total: z.string(),
  criadoEm: z.string(),
  itens: z.array(z.object({ sabor: z.string(), quantidade: z.number().nullable() })),
});

export const pedidoAdminRespostaSchema = pedidoRespostaSchema.extend({ telefone: z.string() });

// O telefone fica de fora da visão pública: quem tem o código vê o pedido, mas não o contato.
export function paraResposta(p: PedidoComItens): z.infer<typeof pedidoRespostaSchema> {
  return {
    codigo: p.codigo,
    status: p.status,
    nomeCliente: p.nomeCliente,
    tipoEntrega: p.tipoEntrega,
    endereco: p.endereco,
    pontoReferencia: p.pontoReferencia,
    observacao: p.observacao,
    enderecoRetirada: p.enderecoRetirada,
    horarioAgendado: p.horarioAgendado?.toISOString() ?? null,
    tempoPreparoMin: p.tempoPreparoMin,
    previsaoEm: p.previsaoEm?.toISOString() ?? null,
    formaPagamento: p.formaPagamento,
    troco:
      p.formaPagamento === FormaPagamento.DINHEIRO
        ? { precisa: p.precisaTroco, para: p.trocoPara?.toFixed(2) ?? null }
        : null,
    instrucaoPix:
      p.formaPagamento === FormaPagamento.PIX
        ? {
            imediato: p.pagarAte === null,
            horasAntecedencia: p.pixAntecedenciaHoras,
            pagarAte: p.pagarAte?.toISOString() ?? null,
          }
        : null,
    quantidadeTotal: p.quantidadeTotal,
    subtotal: p.subtotal.toFixed(2),
    taxaEntrega: p.taxaEntrega.toFixed(2),
    total: p.total.toFixed(2),
    criadoEm: p.criadoEm.toISOString(),
    itens: p.itens.map((i) => ({ sabor: i.sabor?.nome ?? SABOR_MISTO, quantidade: i.quantidade })),
  };
}

export function paraRespostaAdmin(p: PedidoComItens): z.infer<typeof pedidoAdminRespostaSchema> {
  return { ...paraResposta(p), telefone: p.telefone };
}
