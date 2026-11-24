import type { calcularPreco } from '@/lib/preco'
import { erroDeAgendamento } from '@/lib/funcionamento'
import { formatPrice, telefoneValido } from '@/lib/format'
import type {
  Erros,
  FormaPagamento,
  Funcionamento,
  ModoSabores,
  Quando,
  TipoEntrega,
  Valores,
} from '@/types/types'

/** "100" ou "100,50" -> número em reais (0 se inválido). */
export function valorTroco(texto: string) {
  const n = Number(
    texto
      .replace(/\./g, '')
      .replace(',', '.')
      .replace(/[^\d.]/g, ''),
  )
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0
}

/** Tudo o que a validação do pedido precisa saber. */
export interface DadosPedido {
  valores: Valores
  funcionamento: Funcionamento
  qtd: number
  qtdOk: boolean
  modoSabores: ModoSabores | null
  /** Modo "quantidades": saborId -> unidades. */
  selecao: Record<number, number>
  /** Modo "selecao": ids dos sabores marcados. */
  escolhidos: number[]
  /** Há bebidas à venda: a escolha é obrigatória. */
  bebidaObrigatoria: boolean
  /** bebidaId -> unidades. */
  bebidas: Record<number, number>
  /** Marcou "Não quero bebida". */
  semBebida: boolean
  tipo: TipoEntrega | null
  endereco: string
  numero: string
  bairro: string
  quando: Quando | null
  horario: string
  foraDoHorario: boolean
  prontoIndisponivel: boolean
  horarioAtendimento: string | null
  nome: string
  telefone: string
  pagamento: FormaPagamento | null
  precisaTroco: boolean
  /** Troco informado, em reais (0 se vazio ou inválido). */
  troco: number
  preco: ReturnType<typeof calcularPreco> | null
}

/** Valida o pedido e devolve as mensagens por campo (vazio = tudo certo). */
export function validarPedido(d: DadosPedido): Erros {
  const e: Erros = {}
  const somaSabores = Object.values(d.selecao).reduce((a, b) => a + b, 0)

  if (!d.qtdOk)
    e.quantidade = `Escolha de ${d.valores.quantidadeMinima} a ${d.valores.quantidadeMaxima} unidades, de ${d.valores.passo} em ${d.valores.passo}.`
  if (!d.modoSabores) e.sabores = 'Escolha como quer os sabores.'
  else if (d.modoSabores === 'quantidades') {
    if (somaSabores === 0) e.sabores = 'Defina a quantidade de ao menos um sabor.'
    else if (d.qtdOk && somaSabores !== d.qtd)
      e.sabores = `A soma dos sabores (${somaSabores}) deve ser igual a ${d.qtd}.`
  } else if (d.modoSabores === 'selecao' && d.escolhidos.length === 0) {
    e.sabores = 'Marque ao menos um sabor.'
  }
  if (d.bebidaObrigatoria && !d.semBebida && Object.keys(d.bebidas).length === 0)
    e.bebida = 'Escolha ao menos uma bebida ou marque "Não quero bebida".'
  if (!d.tipo) e.tipoEntrega = 'Escolha entrega ou retirada.'
  if (d.tipo === 'ENTREGA') {
    if (d.endereco.trim().length < 5) e.endereco = 'Informe a rua ou avenida de entrega.'
    if (!d.numero.trim()) e.numero = 'Informe o número (ou S/N).'
    if (!d.bairro.trim()) e.bairro = 'Informe o bairro.'
  }
  if (!d.quando) e.quando = 'Escolha quando quer receber.'
  else if (d.quando === 'pronto' && d.prontoIndisponivel) {
    e.quando = d.foraDoHorario
      ? `Estamos fora do horário de atendimento (${d.horarioAtendimento}). Agende para um horário dentro do atendimento.`
      : 'Hoje não estamos fazendo entregas. Agende para outro dia ou escolha retirada.'
  }
  if (d.nome.trim().length < 2) e.nomeCliente = 'Informe seu nome.'
  if (!telefoneValido(d.telefone))
    e.telefone =
      'Informe um celular com DDD + 9 (ex.: (44) 91234-5678). Não inclua o +55 do Brasil.'
  if (!d.pagamento) e.formaPagamento = 'Escolha a forma de pagamento.'
  if (d.pagamento === 'DINHEIRO' && d.precisaTroco) {
    if (!d.troco) e.trocoPara = 'Informe para quanto você precisa de troco (ex.: 100).'
    else if (d.preco && d.troco <= d.preco.total)
      e.trocoPara = `O valor deve ser maior que o total do pedido (${formatPrice(d.preco.total)}).`
  }
  if (d.quando === 'agendar') {
    if (!d.horario) e.horarioAgendado = 'Escolha a data e o horário.'
    else if (new Date(d.horario).getTime() <= Date.now())
      e.horarioAgendado = 'O horário escolhido deve ser no futuro.'
    else {
      const erro = erroDeAgendamento(d.funcionamento, d.tipo, new Date(d.horario))
      if (erro) e.horarioAgendado = erro
    }
  }
  return e
}
