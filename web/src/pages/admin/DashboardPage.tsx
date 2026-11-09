import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChefHat, ChevronLeft, ChevronRight, ClipboardList, Clock, DollarSign, Eye, Hourglass, MapPin, Phone, Store } from 'lucide-react'
import { ErrorState, LoadingState } from '@/components/state-views'
import { StatusBadge } from '@/components/status-badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useStatusUpdate } from '@/hooks/use-status-update'
import { useFetch } from '@/hooks/use-fetch'
import { api } from '@/lib/api'
import { allStatuses, formatDateTime, formatPhone, formatPrice, formatTime, intervaloDoPeriodo, nextStatus, paymentLabels, QUANDO_PRONTO, statusLabels, tipoLabels, todayISO, type Periodo } from '@/lib/format'
import type { PedidoAdmin, StatusPedido } from '@/types/types'

function OrderCard({
  pedido,
  busy,
  onAdvance,
}: {
  pedido: PedidoAdmin
  busy: boolean
  onAdvance: (status: StatusPedido) => void
}) {
  const next = nextStatus(pedido)
  return (
    <li>
      <article className="order-card">
        <div className="order-card__head">
          <div>
            <p className="order-card__title">{pedido.nomeCliente}</p>
            <p className="order-card__meta">
              {pedido.codigo} · {formatTime(pedido.criadoEm)} · {tipoLabels[pedido.tipoEntrega]} · {paymentLabels[pedido.formaPagamento]}
            </p>
          </div>
          <StatusBadge status={pedido.status} />
        </div>
        <ul className="order-card__items">
          {pedido.itens.map((i) => (
            <li key={i.sabor}>
              <span>{i.quantidade === null ? `${i.sabor} (a dividir)` : `${i.quantidade}× ${i.sabor}`}</span>
            </li>
          ))}
        </ul>
        <div className="order-card__info">
          {pedido.tipoEntrega === 'ENTREGA' ? <p><MapPin /> {pedido.endereco}{pedido.pontoReferencia ? ` · Ref.: ${pedido.pontoReferencia}` : ''}</p> : <p><Store /> Retirada no local{pedido.enderecoRetirada ? ` · ${pedido.enderecoRetirada}` : ''}</p>}
          <p>
            <Clock />
            {pedido.horarioAgendado
              ? formatDateTime(pedido.horarioAgendado)
              : pedido.previsaoEm
                ? `${QUANDO_PRONTO} · previsão ${formatTime(pedido.previsaoEm)}`
                : `${QUANDO_PRONTO} · defina o tempo de preparo`}
          </p>
          <p><Phone /> {formatPhone(pedido.telefone)}</p>
        </div>
        <div className="order-card__foot">
          <span className="order-card__total">{formatPrice(pedido.total)}</span>
          <div className="order-card__actions">
            <Link to={`/admin/pedidos/${pedido.codigo}`} className={buttonVariants({ variant: 'secondary', size: 'sm', className: 'h-8' })}>
              <Eye /> Visualizar
            </Link>
            {next && (
              <Button size="sm" className="h-8" disabled={busy} onClick={() => onAdvance(next)}>
                {busy ? 'Salvando...' : `Marcar: ${statusLabels[next]}`}
              </Button>
            )}
          </div>
        </div>
      </article>
    </li>
  )
}

const TAMANHOS_PAGINA = [12, 24, 36, 48] as const

const itensQuantidade = Object.fromEntries(TAMANHOS_PAGINA.map((n) => [String(n), `${n} pedidos`]))
const itensStatus: Record<string, string> = { todos: 'Todos os status', ...Object.fromEntries(allStatuses.map((st) => [st, statusLabels[st]])) }

const formatarDia = (iso: string) => iso.split('-').reverse().join('/')

export default function DashboardPage() {
  const [dia, setDia] = useState(todayISO())
  const [filtro, setFiltro] = useState<StatusPedido | 'todos'>('todos')

  const [periodo, setPeriodo] = useState<Periodo>('todos')
  const [porPagina, setPorPagina] = useState<number>(TAMANHOS_PAGINA[0])
  const [pagina, setPagina] = useState(1)
  const intervalo = intervaloDoPeriodo(periodo, dia)

  const pedidos = useFetch(() => api.pedidosAdmin(intervalo), [intervalo.de, intervalo.ate], 30_000)
  const { update, busy, error } = useStatusUpdate((atualizado) =>
    pedidos.mutate((lista) => lista.map((p) => (p.codigo === atualizado.codigo ? atualizado : p))),
  )

  const lista = pedidos.data ?? []
  const count = (s: StatusPedido) => lista.filter((p) => p.status === s).length
  const faturamento = lista.filter((p) => p.status === 'FINALIZADO').reduce((sum, p) => sum + parseFloat(p.total), 0)
  const kpis = [
    { label: { dia: 'Pedidos do dia', semana: 'Pedidos da semana', mes: 'Pedidos do mês', todos: 'Pedidos' }[periodo], value: String(lista.length), icon: ClipboardList },
    { label: 'Aguardando pagamento', value: String(count('AGUARDANDO_PAGAMENTO')), icon: Hourglass },
    { label: 'Em produção', value: String(count('EM_PRODUCAO')), icon: ChefHat },
    { label: 'Faturamento (finalizados)', value: formatPrice(faturamento), icon: DollarSign },
  ]
  const filtrados = lista.filter((p) => filtro === 'todos' || p.status === filtro)
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const visiveis = filtrados.slice((paginaAtual - 1) * porPagina, paginaAtual * porPagina)

  return (
    <div className="admin-content">
      <section className="kpi-grid" aria-label="Resumo">
        {kpis.map(({ label, value, icon: Icon }) => (
          <div key={label} className="kpi">
            <div className="min-w-0">
              <p className="kpi__label">{label}</p>
              <p className="kpi__value">{value}</p>
            </div>
            <span className="kpi__icon"><Icon className="size-4" /></span>
          </div>
        ))}
      </section>

      <section aria-label="Pedidos" className="stack">
        <div className="toolbar">
          <h2 className="toolbar__title">Pedidos</h2>
          <div className="toolbar__date">
            {periodo !== 'todos' && (
              <Input
                type="date"
                value={dia}
                onChange={(e) => { setDia(e.target.value || todayISO()); setPagina(1) }}
                aria-label={periodo === 'dia' ? 'Dia' : periodo === 'semana' ? 'Dia da semana' : 'Dia do mês'}
                className="w-auto"
              />
            )}
            {(
              [
                ['dia', 'Dia', 'D'],
                ['semana', 'Semanal', 'S'],
                ['mes', 'Mensal', 'M'],
                ['todos', 'Todos os dias', 'TD'],
              ] as const
            ).map(([valor, rotulo, sigla]) => (
              <button key={valor} className="chip" aria-pressed={periodo === valor} aria-label={rotulo} title={rotulo} onClick={() => { setPeriodo(valor); setPagina(1) }}>
                <span aria-hidden="true" className="sm:hidden">{sigla}</span>
                <span aria-hidden="true" className="hidden sm:inline">{rotulo}</span>
              </button>
            ))}
          </div>
        </div>

        {(periodo === 'semana' || periodo === 'mes') && intervalo.de && intervalo.ate && (
          <p className="text-sm text-muted-foreground">
            {periodo === 'semana' ? 'Semana' : 'Mês'} de {formatarDia(intervalo.de)} a {formatarDia(intervalo.ate)}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={filtro}
            items={itensStatus}
            onValueChange={(v) => { if (v) { setFiltro(v as StatusPedido | 'todos'); setPagina(1) } }}
          >
            <SelectTrigger aria-label="Filtrar pedidos por status" className="min-w-44 flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(itensStatus).map(([valor, rotulo]) => (
                <SelectItem key={valor} value={valor}>{rotulo}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(porPagina)}
            items={itensQuantidade}
            onValueChange={(v) => { if (v) { setPorPagina(Number(v)); setPagina(1) } }}
          >
            <SelectTrigger aria-label="Quantidade de pedidos por página" className="w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(itensQuantidade).map(([valor, rotulo]) => (
                <SelectItem key={valor} value={valor}>{rotulo}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && <p role="alert" className="alert alert--error">{error}</p>}

        {pedidos.loading && !pedidos.data ? (
          <LoadingState label="Carregando pedidos..." />
        ) : !pedidos.data ? (
          <ErrorState error={pedidos.error} onRetry={pedidos.reload} title="Não conseguimos carregar os pedidos" />
        ) : visiveis.length === 0 ? (
          <div className="state-box">Nenhum pedido {filtro === 'todos' ? 'neste período' : 'neste status'}.</div>
        ) : (
          <ul className="order-grid">
            {visiveis.map((p) => (
              <OrderCard key={p.codigo} pedido={p} busy={busy === p.codigo} onAdvance={(s) => update(p.codigo, s)} />
            ))}
          </ul>
        )}

        {pedidos.data && filtrados.length > porPagina && (
          <nav aria-label="Paginação dos pedidos" className="flex flex-wrap items-center justify-center gap-3">
            <Button variant="outline" size="sm" disabled={paginaAtual <= 1} onClick={() => setPagina(paginaAtual - 1)}>
              <ChevronLeft /> Anterior
            </Button>
            <span className="text-sm text-muted-foreground" aria-live="polite">
              Página {paginaAtual} de {totalPaginas} · {filtrados.length} pedidos
            </span>
            <Button variant="outline" size="sm" disabled={paginaAtual >= totalPaginas} onClick={() => setPagina(paginaAtual + 1)}>
              Próxima <ChevronRight />
            </Button>
          </nav>
        )}
      </section>
    </div>
  )
}
