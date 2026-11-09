import { FormaPagamento, StatusPedido, TipoEntrega } from "../generated/prisma/enums.js";
import { gerarCodigoPedido } from "../lib/codigo.js";
import { NaoEncontradoError, RegraDeNegocioError, codigoErroPrisma } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import type { CriarPedidoInput } from "../schemas/pedido.js";
import { validarPedidoNoFuncionamento } from "./funcionamento.js";
import { calcularPreco, paraCentavos } from "./preco.js";
import { calcularPrazoPix } from "./prazoPix.js";

export class SaborInvalidoError extends RegraDeNegocioError {}

// Etapas possíveis de cada pedido:
// - entrega nunca fica "pronto para retirada" e vice-versa;
// - pedidos com Pix passam por "aguardando pagamento" e "pagamento aprovado" no lugar de "aguardando".
export function statusPermitidos(tipo: TipoEntrega, forma: FormaPagamento): StatusPedido[] {
  const inicio =
    forma === FormaPagamento.PIX
      ? [StatusPedido.AGUARDANDO_PAGAMENTO, StatusPedido.PAGAMENTO_APROVADO]
      : [StatusPedido.AGUARDANDO];
  const etapaDeSaida =
    tipo === TipoEntrega.ENTREGA ? StatusPedido.EM_ROTA_ENTREGA : StatusPedido.PRONTO_RETIRADA;
  return [...inicio, StatusPedido.EM_PRODUCAO, etapaDeSaida, StatusPedido.FINALIZADO];
}

const TENTATIVAS_CODIGO = 5;

const incluirItens = { itens: { include: { sabor: { select: { id: true, nome: true } } } } };

const paraDecimal = (centavos: number) => (centavos / 100).toFixed(2);

function codigoDuplicado(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
}

export async function criarPedido(input: CriarPedidoInput) {
  const [faixas, config] = await Promise.all([
    prisma.faixaPreco.findMany(),
    prisma.configuracao.findUniqueOrThrow({ where: { id: 1 } }),
  ]);

  validarPedidoNoFuncionamento(
    config,
    { tipoEntrega: input.tipoEntrega, horarioAgendado: input.horarioAgendado ?? null },
    new Date(),
  );

  if (input.sabores.length > 0) {
    const ids = input.sabores.map((s) => s.saborId);
    const ativos = await prisma.sabor.count({ where: { id: { in: ids }, ativo: true } });
    if (ativos !== ids.length) {
      throw new SaborInvalidoError("Um ou mais sabores não existem ou estão indisponíveis.");
    }
  }

  const preco = calcularPreco({
    quantidade: input.quantidade,
    tipoEntrega: input.tipoEntrega,
    faixas: faixas.map((f) => ({ quantidade: f.quantidade, valorCentavos: paraCentavos(f.valor) })),
    config: {
      valorUnidadeAcimaDe100Centavos: paraCentavos(config.valorUnidadeAcimaDe100),
      taxaEntregaCentavos: paraCentavos(config.taxaEntregaDe50a199),
      taxaEntregaAte49Centavos: paraCentavos(config.taxaEntregaAte49),
      entregaGratisAPartirDe: config.entregaGratisAPartirDe,
    },
  });

  // Pedido misto vira um único item sem sabor.
  const itens =
    input.sabores.length > 0
      ? input.sabores.map((s) => ({ saborId: s.saborId, quantidade: s.quantidade ?? null }))
      : [{ saborId: null, quantidade: input.quantidade }];

  const ehEntrega = input.tipoEntrega === TipoEntrega.ENTREGA;
  const ehPix = input.formaPagamento === FormaPagamento.PIX;
  const prazoPix = ehPix
    ? calcularPrazoPix({
        agora: new Date(),
        horarioAgendado: input.horarioAgendado ?? null,
        quantidade: input.quantidade,
        horasAteLimite: config.pixAntecedenciaAteLimiteHoras,
        horasAcimaLimite: config.pixAntecedenciaAcimaLimiteHoras,
      })
    : null;

  const precisaTroco = input.formaPagamento === FormaPagamento.DINHEIRO && input.precisaTroco;
  const trocoParaCentavos = precisaTroco && input.trocoPara ? Math.round(input.trocoPara * 100) : null;
  if (trocoParaCentavos !== null && trocoParaCentavos <= preco.totalCentavos) {
    throw new RegraDeNegocioError(
      `O valor para o troco deve ser maior que o total do pedido (R$ ${paraDecimal(preco.totalCentavos).replace(".", ",")}).`,
    );
  }

  for (let tentativa = 1; ; tentativa++) {
    try {
      return await prisma.pedido.create({
        data: {
          codigo: gerarCodigoPedido(),
          nomeCliente: input.nomeCliente,
          telefone: input.telefone,
          tipoEntrega: input.tipoEntrega,
          endereco: ehEntrega ? (input.endereco ?? null) : null,
          pontoReferencia: ehEntrega ? (input.pontoReferencia ?? null) : null,
          observacao: input.observacao ?? null,
          enderecoRetirada: ehEntrega ? null : (config.enderecoRetirada ?? null),
          horarioAgendado: input.horarioAgendado ?? null,
          formaPagamento: input.formaPagamento,
          precisaTroco,
          trocoPara: trocoParaCentavos === null ? null : paraDecimal(trocoParaCentavos),
          status: ehPix ? StatusPedido.AGUARDANDO_PAGAMENTO : StatusPedido.AGUARDANDO,
          pixAntecedenciaHoras: prazoPix?.horasAntecedencia ?? null,
          pagarAte: prazoPix?.pagarAte ?? null,
          quantidadeTotal: input.quantidade,
          subtotal: paraDecimal(preco.subtotalCentavos),
          taxaEntrega: paraDecimal(preco.taxaEntregaCentavos),
          total: paraDecimal(preco.totalCentavos),
          itens: { create: itens },
        },
        include: incluirItens,
      });
    } catch (err) {
      // Colisão do código único: sorteia outro.
      if (!codigoDuplicado(err) || tentativa >= TENTATIVAS_CODIGO) throw err;
    }
  }
}

export function buscarPedidoPorCodigo(codigo: string) {
  return prisma.pedido.findUnique({ where: { codigo }, include: incluirItens });
}

export type PedidoComItens = NonNullable<Awaited<ReturnType<typeof buscarPedidoPorCodigo>>>;

// O admin pode voltar uma etapa (para corrigir um clique errado); só não pode usar uma etapa
// que não existe para aquele pedido. Manter o status atual é sempre aceito (pedidos antigos).
export async function atualizarStatusPedido(codigo: string, status: StatusPedido) {
  const pedido = await prisma.pedido.findUnique({
    where: { codigo },
    select: { tipoEntrega: true, formaPagamento: true, status: true },
  });
  if (!pedido) throw new NaoEncontradoError("Pedido não encontrado.");

  const permitidos = statusPermitidos(pedido.tipoEntrega, pedido.formaPagamento);
  if (status !== pedido.status && !permitidos.includes(status)) {
    const existeNoTipo =
      statusPermitidos(pedido.tipoEntrega, FormaPagamento.PIX).includes(status) ||
      statusPermitidos(pedido.tipoEntrega, FormaPagamento.DINHEIRO).includes(status);
    throw new RegraDeNegocioError(
      existeNoTipo
        ? `O status ${status} não existe para pedidos ${pedido.formaPagamento === FormaPagamento.PIX ? "pagos com Pix" : "pagos sem Pix"}.`
        : `O status ${status} não existe para pedidos de ${pedido.tipoEntrega === TipoEntrega.ENTREGA ? "entrega" : "retirada"}.`,
    );
  }

  return prisma.pedido.update({ where: { codigo }, data: { status }, include: incluirItens });
}

// Pedidos sem horário agendado ("para quando ficar pronto"): o admin informa quanto tempo vai levar
// e a previsão passa a contar a partir de agora.
export async function definirTempoPreparoPedido(codigo: string, minutos: number) {
  const pedido = await prisma.pedido.findUnique({ where: { codigo }, select: { horarioAgendado: true } });
  if (!pedido) throw new NaoEncontradoError("Pedido não encontrado.");
  if (pedido.horarioAgendado) {
    throw new RegraDeNegocioError("Este pedido tem horário agendado; o tempo de preparo só vale para pedidos sem horário.");
  }

  return prisma.pedido.update({
    where: { codigo },
    data: { tempoPreparoMin: minutos, previsaoEm: new Date(Date.now() + minutos * 60_000) },
    include: incluirItens,
  });
}

// Exclusão definitiva: os itens do pedido são apagados junto (onDelete: Cascade).
export async function excluirPedido(codigo: string) {
  try {
    await prisma.pedido.delete({ where: { codigo } });
  } catch (err) {
    if (codigoErroPrisma(err) === "P2025") throw new NaoEncontradoError("Pedido não encontrado.");
    throw err;
  }
}

// Datas do filtro valem no horário de Brasília (UTC-3, sem horário de verão).
const inicioDoDia = (dia: string) => new Date(`${dia}T00:00:00.000-03:00`);
const fimDoDia = (dia: string) => new Date(`${dia}T23:59:59.999-03:00`);

export function listarPedidos(filtros: { status?: StatusPedido; de?: string; ate?: string }) {
  return prisma.pedido.findMany({
    where: {
      ...(filtros.status && { status: filtros.status }),
      ...((filtros.de || filtros.ate) && {
        criadoEm: {
          ...(filtros.de && { gte: inicioDoDia(filtros.de) }),
          ...(filtros.ate && { lte: fimDoDia(filtros.ate) }),
        },
      }),
    },
    include: incluirItens,
    orderBy: { criadoEm: "desc" },
    take: 1000, // um mês de pedidos cabe com folga
  });
}

/** Apaga todos os pedidos (os itens saem junto, por cascata). Usado pela limpeza diária da demo. */
export async function limparPedidos(): Promise<number> {
  const { count } = await prisma.pedido.deleteMany();
  return count;
}
