import type { FormaPagamento, StatusPedido, TipoEntrega } from '@/types/types'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const formatPrice = (value: number | string) => brl.format(typeof value === 'string' ? parseFloat(value) : value)

export function textoTroco(troco: { precisa: boolean; para: string | null } | null) {
  if (!troco) return null
  return troco.precisa && troco.para ? `Troco para ${formatPrice(troco.para)}` : 'Não precisa de troco'
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export type Periodo = 'dia' | 'semana' | 'mes' | 'todos'

const isoUTC = (d: Date) => d.toISOString().slice(0, 10)

export function intervaloDoPeriodo(periodo: Periodo, diaISO: string): { de?: string; ate?: string } {
  if (periodo === 'todos' || !diaISO) return {}
  const [a, m, d] = diaISO.split('-').map(Number)
  if (periodo === 'dia') return { de: diaISO, ate: diaISO }
  if (periodo === 'mes') return { de: isoUTC(new Date(Date.UTC(a, m - 1, 1))), ate: isoUTC(new Date(Date.UTC(a, m, 0))) }
  const dia = new Date(Date.UTC(a, m - 1, d))
  const desdeSegunda = (dia.getUTCDay() + 6) % 7
  const segunda = new Date(Date.UTC(a, m - 1, d - desdeSegunda))
  const domingo = new Date(Date.UTC(a, m - 1, d - desdeSegunda + 6))
  return { de: isoUTC(segunda), ate: isoUTC(domingo) }
}

export function todayISO() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function formatPhone(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export const statusLabels: Record<StatusPedido, string> = {
  AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
  PAGAMENTO_APROVADO: 'Pagamento aprovado',
  AGUARDANDO: 'Aguardando',
  EM_PRODUCAO: 'Em produção',
  EM_ROTA_ENTREGA: 'Em rota de entrega',
  PRONTO_RETIRADA: 'Pronto para retirada',
  FINALIZADO: 'Finalizado',
}

export const allStatuses = Object.keys(statusLabels) as StatusPedido[]

type PedidoFluxo = { tipoEntrega: TipoEntrega; formaPagamento: FormaPagamento; status: StatusPedido }

export function statusFlow(pedido: PedidoFluxo): StatusPedido[] {
  const inicio: StatusPedido[] =
    pedido.formaPagamento === 'PIX' ? ['AGUARDANDO_PAGAMENTO', 'PAGAMENTO_APROVADO'] : ['AGUARDANDO']
  const flow: StatusPedido[] = [
    ...inicio,
    'EM_PRODUCAO',
    pedido.tipoEntrega === 'ENTREGA' ? 'EM_ROTA_ENTREGA' : 'PRONTO_RETIRADA',
    'FINALIZADO',
  ]
  return flow.includes(pedido.status) ? flow : [pedido.status, ...flow]
}

export function nextStatus(pedido: PedidoFluxo): StatusPedido | null {
  const flow = statusFlow(pedido)
  const i = flow.indexOf(pedido.status)
  return i >= 0 && i < flow.length - 1 ? flow[i + 1] : null
}

export const QUANDO_PRONTO = 'Assim que ficar pronto'

export const tipoLabels: Record<TipoEntrega, string> = {
  ENTREGA: 'Entrega',
  RETIRADA: 'Retirada',
}

export const paymentLabels: Record<FormaPagamento, string> = {
  DINHEIRO: 'Dinheiro',
  CARTAO: 'Cartão',
  PIX: 'Pix',
}

export function parseMoney(text: string): number | null {
  const t = text.trim().replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export const hasMaxTwoDecimals = (n: number) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6

export const moneyToInput = (v: string) => v.replace('.', ',')

export const tipoPixLabels = {
  CPF: 'CPF',
  CNPJ: 'CNPJ',
  TELEFONE: 'Telefone',
  ALEATORIA: 'Chave aleatória',
} as const

export const formatQtdItem = (quantidade: number | null) => (quantidade === null ? 'a dividir' : `${quantidade} un.`)
export const temItemADividir = (itens: { quantidade: number | null }[]) => itens.some((i) => i.quantidade === null)
