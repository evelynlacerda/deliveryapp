import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BadgeCheck, Clock, MapPin, MessageCircle, MessageSquare, Phone, Store, Trash2 } from 'lucide-react'
import { FormStatus } from '@/components/form-status'
import { useBrand } from '@/context/brand'
import { ErrorState, LoadingState } from '@/components/state-views'
import { StatusBadge } from '@/components/status-badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useFetch } from '@/hooks/use-fetch'
import { useSave } from '@/hooks/use-save'
import { useStatusUpdate } from '@/hooks/use-status-update'
import { ApiError, api } from '@/lib/api'
import { formatDateTime, formatQtdItem, temItemADividir, formatPhone, formatPrice, formatTime, paymentLabels, QUANDO_PRONTO, statusFlow, statusLabels, tipoLabels, textoTroco } from '@/lib/format'
import { textoPrazoPix } from '@/lib/prazo-pix'
import { whatsappLink } from '@/lib/whatsapp'
import type { Pedido, PedidoAdmin } from '@/types/types'

type Detalhe = Pedido & { telefone?: string }

const TEMPOS_RAPIDOS = [15, 30, 45, 60, 90]

async function carregarPedido(codigo: string): Promise<Detalhe> {
  const lista = await api.pedidosAdmin()
  const achado = lista.find((p) => p.codigo === codigo.toUpperCase())
  return achado ?? api.buscarPedido(codigo)
}

function TempoPreparoForm({ pedido, onSaved }: { pedido: Pedido; onSaved: (p: PedidoAdmin) => void }) {
  const [minutos, setMinutos] = useState(String(pedido.tempoPreparoMin ?? 30))
  const save = useSave()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const n = Number(minutos)
    if (!Number.isInteger(n) || n < 1 || n > 1440) return save.fail('Use um número inteiro de 1 a 1440 minutos.')
    await save.run(async () => onSaved(await api.definirTempoPreparoPedido(pedido.codigo, n)))
  }

  return (
    <section className="section">
      <h3 className="section__title mb-1"><Clock className="size-4" /> Tempo de preparo</h3>
      <p className="section__hint">
        O cliente pediu "{QUANDO_PRONTO.toLowerCase()}". Informe quanto tempo vai levar; a previsão passa a contar a partir de agora.
        {pedido.previsaoEm && <> Previsão atual: <b>{formatTime(pedido.previsaoEm)}</b> ({pedido.tempoPreparoMin} min).</>}
      </p>
      <form onSubmit={submit} noValidate>
        <div className="chip-row mb-3">
          {TEMPOS_RAPIDOS.map((t) => (
            <button key={t} type="button" className="chip" aria-pressed={minutos === String(t)} onClick={() => { setMinutos(String(t)); save.reset() }}>
              {t} min
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="field">
            <Label htmlFor="tempo-pedido">Minutos</Label>
            <Input id="tempo-pedido" inputMode="numeric" className="w-28" value={minutos} onChange={(e) => { setMinutos(e.target.value.replace(/\D/g, '')); save.reset() }} />
          </div>
          <Button type="submit" disabled={save.saving}>{save.saving ? 'Salvando...' : pedido.previsaoEm ? 'Atualizar tempo' : 'Definir tempo'}</Button>
        </div>
        <div className="form-actions"><FormStatus error={save.error} saved={save.saved} /></div>
      </form>
    </section>
  )
}

function ExcluirPedido({ codigo }: { codigo: string }) {
  const navigate = useNavigate()
  const [confirmando, setConfirmando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [erro, setErro] = useState('')

  async function excluir() {
    setExcluindo(true)
    setErro('')
    try {
      await api.excluirPedido(codigo)
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível excluir o pedido.')
      setExcluindo(false)
    }
  }

  return (
    <section className="danger-zone" aria-label="Excluir pedido">
      {!confirmando ? (
        <>
          <div>
            <h3 className="danger-zone__title">Excluir pedido</h3>
            <p className="danger-zone__text">Remove o pedido e seus itens de forma definitiva.</p>
          </div>
          <Button variant="destructive" onClick={() => setConfirmando(true)}>
            <Trash2 /> Excluir pedido
          </Button>
        </>
      ) : (
        <div className="danger-zone__confirm" role="alertdialog" aria-labelledby="excluir-titulo">
          <p id="excluir-titulo" className="danger-zone__title">
            Excluir o pedido {codigo}? Esta ação não pode ser desfeita.
          </p>
          <div className="danger-zone__actions">
            <Button variant="destructive" disabled={excluindo} onClick={excluir}>
              <Trash2 /> {excluindo ? 'Excluindo...' : 'Sim, excluir'}
            </Button>
            <Button variant="outline" disabled={excluindo} onClick={() => setConfirmando(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
      {erro && <p role="alert" className="alert alert--error">{erro}</p>}
    </section>
  )
}

export default function OrderDetailPage() {
  const { marca } = useBrand()
  const { codigo = '' } = useParams()
  const pedido = useFetch(() => carregarPedido(codigo), [codigo], 30_000)
  const funcionamento = useFetch(api.funcionamento, [])
  const { update, busy, error } = useStatusUpdate((atualizado: PedidoAdmin) => pedido.mutate(() => atualizado))

  const p = pedido.data
  const back = (
    <Link to="/admin/dashboard" className="back-link">
      <ArrowLeft className="size-4" /> Voltar aos pedidos
    </Link>
  )

  if (pedido.loading && !p) return <div className="admin-content">{back}<LoadingState label="Carregando pedido..." /></div>
  if (!p) {
    const naoEncontrado = pedido.error instanceof ApiError && pedido.error.status === 404
    return (
      <div className="admin-content">
        {back}
        <ErrorState error={pedido.error} title={naoEncontrado ? 'Pedido não encontrado' : 'Não conseguimos abrir o pedido'} onRetry={naoEncontrado ? undefined : pedido.reload} />
      </div>
    )
  }

  const editavel = p.telefone !== undefined
  const aguardandoPagamento = p.status === 'AGUARDANDO_PAGAMENTO'
  const mensagem = `Olá, ${p.nomeCliente.split(' ')[0]}! Aqui é do ${marca.nome}, sobre o seu pedido ${p.codigo} (${statusLabels[p.status].toLowerCase()}).`

  const enderecoRetirada = p.enderecoRetirada ?? funcionamento.data?.enderecoRetirada ?? null
  const aviso =
    p.status === 'PRONTO_RETIRADA'
      ? {
          rotulo: 'Avisar: pronto para retirada',
          texto: `Seu pedido está pronto para retirada!${enderecoRetirada ? `
Endereço: ${enderecoRetirada}` : ''}`,
        }
      : p.status === 'EM_ROTA_ENTREGA'
        ? { rotulo: 'Avisar: saiu para entrega', texto: 'Seu pedido saiu para entrega!' }
        : null

  return (
    <div className="admin-content max-w-4xl">
      {back}

      <div className="tracking-head">
        <div>
          <h2 className="flex flex-wrap items-center gap-3 text-2xl font-bold">
            Pedido {p.codigo} <StatusBadge status={p.status} />
          </h2>
          <p className="text-sm text-muted-foreground">Feito em {formatDateTime(p.criadoEm)}</p>
        </div>
        {p.telefone && (
          <div className="flex flex-wrap gap-2">
            {aviso && (
              <a href={whatsappLink(p.telefone, aviso.texto)} target="_blank" rel="noopener noreferrer" className={buttonVariants({ className: 'h-10' })}>
                <MessageCircle /> {aviso.rotulo}
              </a>
            )}
            <a
              href={whatsappLink(p.telefone, mensagem)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: aviso ? 'outline' : 'default', className: 'h-10' })}
            >
              <MessageCircle /> Chamar no WhatsApp
            </a>
          </div>
        )}
      </div>

      {p.instrucaoPix && (
        <section className="alert alert--info grid gap-3">
          <p className="font-medium">Pagamento via Pix · {formatPrice(p.total)}</p>
          <p>{textoPrazoPix(p.instrucaoPix, formatDateTime)}</p>
          {editavel && aguardandoPagamento && (
            <div>
              <Button disabled={busy === p.codigo} onClick={() => update(p.codigo, 'PAGAMENTO_APROVADO')}>
                <BadgeCheck /> {busy === p.codigo ? 'Salvando...' : 'Comprovante recebido: aprovar pagamento'}
              </Button>
            </div>
          )}
        </section>
      )}

      <section className="section">
        <h3 className="section__title mb-3">Status do pedido</h3>
        {editavel ? (
          <div className="status-picker">
            {statusFlow(p).map((s) => (
              <button key={s} className="chip" aria-pressed={p.status === s} disabled={busy === p.codigo} onClick={() => p.status !== s && update(p.codigo, s)}>
                {statusLabels[s]}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Este pedido é antigo e não está mais na lista do painel; só é possível consultá-lo.</p>
        )}
        {error && <p role="alert" className="alert alert--error mt-3">{error}</p>}
      </section>

      {editavel && !p.horarioAgendado && (
        <TempoPreparoForm pedido={p} onSaved={(atualizado) => pedido.mutate(() => atualizado)} />
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <section className="section">
          <h3 className="section__title mb-3">Cliente e entrega</h3>
          <dl className="info-list">
            <div><dt>Nome</dt><dd>{p.nomeCliente}</dd></div>
            {p.telefone && <div><dt><Phone className="size-3.5" /> Telefone</dt><dd>{formatPhone(p.telefone)}</dd></div>}
            <div>
              <dt>{p.tipoEntrega === 'ENTREGA' ? <MapPin className="size-3.5" /> : <Store className="size-3.5" />} {tipoLabels[p.tipoEntrega]}</dt>
              <dd>
                {p.tipoEntrega === 'ENTREGA' ? (
                  <>
                    {p.endereco}
                    {p.pontoReferencia && <span className="block font-normal text-muted-foreground">Ref.: {p.pontoReferencia}</span>}
                  </>
                ) : (
                  <>
                    Retirada no local
                    {p.enderecoRetirada && <span className="block font-normal text-muted-foreground">{p.enderecoRetirada}</span>}
                  </>
                )}
              </dd>
            </div>
            <div>
              <dt><Clock className="size-3.5" /> Quando</dt>
              <dd>
                {p.horarioAgendado ? formatDateTime(p.horarioAgendado) : QUANDO_PRONTO}
                {!p.horarioAgendado && p.previsaoEm && <span className="font-normal text-muted-foreground"> · previsão {formatTime(p.previsaoEm)}</span>}
              </dd>
            </div>
            <div>
              <dt>Pagamento</dt>
              <dd>
                {paymentLabels[p.formaPagamento]}
                {p.troco && <span className="block font-normal text-muted-foreground">{textoTroco(p.troco)}</span>}
              </dd>
            </div>
            {p.observacao && (
              <div>
                <dt><MessageSquare className="size-3.5" /> Observações</dt>
                <dd className="whitespace-pre-wrap">{p.observacao}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className="section">
          <h3 className="section__title mb-2">Itens</h3>
          <ul className="item-list">
            {p.itens.map((i) => (
              <li key={i.sabor}><span>{i.sabor}</span><span>{formatQtdItem(i.quantidade)}</span></li>
            ))}
          </ul>
          {temItemADividir(p.itens) && (
            <p className="summary__note mt-2">O cliente escolheu só os sabores: divida as {p.quantidadeTotal} unidades entre eles.</p>
          )}
          <dl className="summary__rows mt-3 mb-0 border-b-0 pb-0">
            <div className="summary__row"><dt>Subtotal ({p.quantidadeTotal} un.)</dt><dd>{formatPrice(p.subtotal)}</dd></div>
            <div className="summary__row"><dt>Entrega</dt><dd>{parseFloat(p.taxaEntrega) === 0 ? 'Grátis' : formatPrice(p.taxaEntrega)}</dd></div>
            <div className="summary__row summary__row--total"><dt>Total</dt><dd>{formatPrice(p.total)}</dd></div>
          </dl>
        </section>
      </div>

      {editavel && <ExcluirPedido codigo={p.codigo} />}
    </div>
  )
}
