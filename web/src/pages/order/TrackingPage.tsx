import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ArrowLeft, Check, CheckCircle2, Clock, Copy, MapPin, MessageCircle, MessageSquare, Store } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { ErrorState, LoadingState } from '@/components/state-views'
import { StatusBadge } from '@/components/status-badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { useFetch } from '@/hooks/use-fetch'
import { ApiError, api } from '@/lib/api'
import { formatDateTime, formatQtdItem, temItemADividir, formatPrice, formatTime, paymentLabels, QUANDO_PRONTO, statusFlow, statusLabels, tipoLabels, textoTroco } from '@/lib/format'
import { textoPrazoPix } from '@/lib/prazo-pix'
import { whatsappLink } from '@/lib/whatsapp'
import type { Pedido, Pix } from '@/types/types'

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(text)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={copiar}>
      {copiado ? <Check /> : <Copy />} {copiado ? 'Copiado!' : label}
    </Button>
  )
}

function PixBox({ pix, pedido }: { pix: Pix; pedido: Pedido }) {
  const instrucao = pedido.instrucaoPix
  const mensagem = `Olá! Segue o comprovante do pagamento via Pix do pedido ${pedido.codigo} (${formatPrice(pedido.total)}), em nome de ${pedido.nomeCliente}.`

  return (
    <section className="pix-box" aria-label="Pagamento via Pix">
      <h2 className="text-lg font-semibold">Pague com Pix</h2>
      {instrucao && <p className="alert alert--info font-medium">{textoPrazoPix(instrucao, formatDateTime)}</p>}

      <dl className="pix-box__data">
        <div>
          <dt>Valor</dt>
          <dd className="pix-box__amount">{formatPrice(pedido.total)}</dd>
        </div>
        {pix.titular && <div><dt>Favorecido</dt><dd>{pix.titular}</dd></div>}
        {pix.banco && <div><dt>Banco</dt><dd>{pix.banco}</dd></div>}
        <div>
          <dt>Chave Pix ({pix.tipo === 'ALEATORIA' ? 'aleatória' : pix.tipo.toLowerCase()})</dt>
          <dd className="pix-box__key">{pix.chaveParaCopiar}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2">
        <CopyButton text={pix.chaveParaCopiar} label="Copiar chave" />
        <CopyButton text={pedido.total} label="Copiar valor" />
      </div>

      {pix.whatsapp ? (
        <a
          href={whatsappLink(pix.whatsapp, mensagem)}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ size: 'lg', className: 'h-11 w-full text-base' })}
        >
          <MessageCircle /> Enviar comprovante no WhatsApp
        </a>
      ) : (
        <p className="text-sm text-muted-foreground">Depois de pagar, envie o comprovante para o WhatsApp do estabelecimento. O pedido só será iniciado após a confirmação do pagamento.</p>
      )}
    </section>
  )
}

function Quando({ p }: { p: Pedido }) {
  if (p.horarioAgendado) return <>{formatDateTime(p.horarioAgendado)}</>
  return <>{QUANDO_PRONTO}</>
}

export default function TrackingPage() {
  const { codigo = '' } = useParams()
  const location = useLocation()
  const recemCriado = (location.state as { novo?: boolean } | null)?.novo === true

  const pedido = useFetch(() => api.buscarPedido(codigo), [codigo], 20_000)
  const funcionamento = useFetch(api.funcionamento, [])
  const extras = useFetch(async () => ({ pix: await api.pix(), tempo: await api.tempoPreparo() }), [])

  const naoEncontrado = pedido.error instanceof ApiError && pedido.error.status === 404
  const p = pedido.data
  const aguardandoPagamento = p?.formaPagamento === 'PIX' && (p.status === 'AGUARDANDO_PAGAMENTO' || p.status === 'AGUARDANDO')

  return (
    <>
      <SiteHeader whatsapp={extras.data?.pix.whatsapp} />
      <main className="page page--narrow">
        <Link to="/pedido" className="back-link my-4">
          <ArrowLeft className="size-4" /> Fazer outro pedido
        </Link>

        {pedido.loading && !p ? (
          <LoadingState label="Buscando seu pedido..." />
        ) : !p ? (
          <ErrorState
            error={pedido.error}
            title={naoEncontrado ? 'Pedido não encontrado' : 'Não conseguimos abrir o pedido'}
            onRetry={naoEncontrado ? undefined : pedido.reload}
          >
            {naoEncontrado && <p>Confira o código ({codigo}) e tente de novo.</p>}
          </ErrorState>
        ) : (
          <div className="stack">
            {recemCriado && (
              <div className="alert alert--info flex items-start gap-2" role="status">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
                <p>
                  <b>Pedido recebido!</b> Guarde o código abaixo para acompanhar. Esta página atualiza sozinha.
                </p>
              </div>
            )}

            <section className="section">
              <div className="tracking-head">
                <div>
                  <p className="tracking-head__title">Código do pedido</p>
                  <span className="code-badge">{p.codigo}</span>
                </div>
                <StatusBadge status={p.status} />
              </div>
              {p.previsaoEm && p.status !== 'FINALIZADO' ? (
                <p className="section__hint mt-3 mb-0 flex items-center gap-1.5">
                  <Clock className="size-4" /> Previsão de ficar pronto: <b>{formatTime(p.previsaoEm)}</b>
                  {p.tempoPreparoMin ? ` (cerca de ${p.tempoPreparoMin} min)` : ''}
                </p>
              ) : (
                extras.data &&
                !p.horarioAgendado &&
                !aguardandoPagamento &&
                (p.status === 'AGUARDANDO' || p.status === 'PAGAMENTO_APROVADO' || p.status === 'EM_PRODUCAO') && (
                  <p className="section__hint mt-3 mb-0 flex items-center gap-1.5">
                    <Clock className="size-4" /> Preparo em {extras.data.tempo.minimoMin} a {extras.data.tempo.maximoMin} min.
                  </p>
                )
              )}
            </section>

            {aguardandoPagamento && extras.data?.pix.configurada && <PixBox pix={extras.data.pix} pedido={p} />}

            <section className="section">
              <h2 className="section__title mb-3">Andamento</h2>
              <ol className="timeline">
                {(() => {
                  const flow = statusFlow(p)
                  const atual = flow.indexOf(p.status)
                  return flow.map((s, i) => (
                    <li key={s} className="timeline__step" data-state={i < atual ? 'done' : i === atual ? 'current' : 'todo'}>
                      <span className="timeline__dot">{i <= atual ? <Check className="size-4" /> : i + 1}</span>
                      <span className="timeline__label">{statusLabels[s]}</span>
                    </li>
                  ))
                })()}
              </ol>
            </section>

            <section className="section">
              <h2 className="section__title mb-3">Detalhes</h2>
              <dl className="info-list">
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
                        {(p.enderecoRetirada ?? funcionamento.data?.enderecoRetirada) && (
                          <span className="block font-normal text-muted-foreground">{p.enderecoRetirada ?? funcionamento.data?.enderecoRetirada}</span>
                        )}
                      </>
                    )}
                  </dd>
                </div>
                <div>
                  <dt><Clock className="size-3.5" /> Quando</dt>
                  <dd><Quando p={p} /></dd>
                </div>
                <div>
                  <dt>Pagamento</dt>
                  <dd>
                    {paymentLabels[p.formaPagamento]}
                    {p.troco && <span className="block font-normal text-muted-foreground">{textoTroco(p.troco)}</span>}
                  </dd>
                </div>
                <div>
                  <dt>Cliente</dt>
                  <dd>{p.nomeCliente}</dd>
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
              <h2 className="section__title mb-2">Itens</h2>
              <ul className="item-list">
                {p.itens.map((i) => (
                  <li key={i.sabor}>
                    <span>{i.sabor}</span>
                    <span>{formatQtdItem(i.quantidade)}</span>
                  </li>
                ))}
              </ul>
              {temItemADividir(p.itens) && (
                <p className="summary__note mt-2">Você escolheu só os sabores: a gente divide as {p.quantidadeTotal} unidades entre eles.</p>
              )}
              <dl className="summary__rows mt-3 mb-0 border-b-0 pb-0">
                <div className="summary__row"><dt>Subtotal ({p.quantidadeTotal} un.)</dt><dd>{formatPrice(p.subtotal)}</dd></div>
                <div className="summary__row"><dt>Entrega</dt><dd>{parseFloat(p.taxaEntrega) === 0 ? 'Grátis' : formatPrice(p.taxaEntrega)}</dd></div>
                <div className="summary__row summary__row--total"><dt>Total</dt><dd>{formatPrice(p.total)}</dd></div>
              </dl>
            </section>
          </div>
        )}
      </main>
    </>
  )
}
