import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, Check, Clock, Info, MapPin, MapPinCheck, Minus, Plus, Search, ShoppingBag, Store, Truck } from 'lucide-react'
import { AvisoEntrega } from '@/components/aviso-entrega'
import { ErrorState, LoadingState } from '@/components/state-views'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useFetch } from '@/hooks/use-fetch'
import { ApiError, api } from '@/lib/api'
import { erroDeAgendamento, textoHorario } from '@/lib/funcionamento'
import { formatDateTime, formatPhone, formatPrice, paymentLabels, QUANDO_PRONTO, toLocalInputValue } from '@/lib/format'
import { calcularPreco, quantidadeValida } from '@/lib/preco'
import { previaPrazoPix, textoPrazoPix } from '@/lib/prazo-pix'
import { cn } from '@/lib/utils'
import type { Catalogo, CriarPedidoBody, Funcionamento, FormaPagamento, TipoEntrega } from '@/types/types'

type Erros = Record<string, string>

const QUICK_QUANTITIES = [10, 20, 30, 50, 100, 200]

const paymentDescriptions: Record<FormaPagamento, string> = {
  DINHEIRO: 'Pague na entrega ou na retirada.',
  CARTAO: 'Débito ou crédito, na entrega ou na retirada.',
  PIX: 'Copie a chave e pague pelo seu banco. O pedido só começa após o comprovante e a confirmação do pagamento.',
}

function TrackOrder() {
  const navigate = useNavigate()
  const [codigo, setCodigo] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const c = codigo.trim().toUpperCase()
    if (c.length === 8) navigate(`/pedido/${c}`)
  }

  return (
    <form onSubmit={submit} className="hero__track">
      <Input
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        maxLength={8}
        placeholder="Código do pedido"
        aria-label="Código do pedido"
        className="bg-background uppercase"
      />
      <Button type="submit" variant="outline" disabled={codigo.trim().length !== 8}>
        <Search /> Acompanhar
      </Button>
    </form>
  )
}

function OrderForm({ catalogo }: { catalogo: Catalogo }) {
  const { sabores, valores, tempo, taxas, pix, funcionamento } = catalogo
  const navigate = useNavigate()

  const [qtdText, setQtdText] = useState('')
  const [modoSabores, setModoSabores] = useState<'misto' | 'quantidades' | 'selecao' | null>(null)
  const [selecao, setSelecao] = useState<Record<number, number>>({})
  const [escolhidos, setEscolhidos] = useState<number[]>([])
  const [tipo, setTipo] = useState<TipoEntrega | null>(null)
  const [endereco, setEndereco] = useState('')
  const [pontoReferencia, setPontoReferencia] = useState('')
  const [observacao, setObservacao] = useState('')
  const [quando, setQuando] = useState<'pronto' | 'agendar' | null>(null)
  const [horario, setHorario] = useState('')
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [pagamento, setPagamento] = useState<FormaPagamento | null>(null)
  const [precisaTroco, setPrecisaTroco] = useState(false)
  const [trocoText, setTrocoText] = useState('')
  const [erros, setErros] = useState<Erros>({})
  const [erroGeral, setErroGeral] = useState('')
  const [enviando, setEnviando] = useState(false)

  const qtd = Number(qtdText)
  const qtdOk = quantidadeValida(qtd, valores)
  const somaSabores = Object.values(selecao).reduce((a, b) => a + b, 0)
  const restante = qtdOk ? qtd - somaSabores : 0
  const nSabores = modoSabores === 'quantidades' ? Object.keys(selecao).length : modoSabores === 'selecao' ? escolhidos.length : 0

  const subtotal = useMemo(
    () => (qtdOk ? calcularPreco(qtd, 'RETIRADA', valores, taxas).subtotal : null),
    [qtd, qtdOk, valores, taxas],
  )
  const preco = useMemo(
    () => (qtdOk && tipo ? calcularPreco(qtd, tipo, valores, taxas) : null),
    [qtd, qtdOk, tipo, valores, taxas],
  )
  const faltaParaGratis = taxas.entregaGratisAPartirDe - (qtdOk ? qtd : 0)

  const formasPagamento = (['DINHEIRO', 'CARTAO', 'PIX'] as FormaPagamento[]).filter((f) => f !== 'PIX' || pix.configurada)

  const horarioAtendimento = textoHorario(funcionamento)
  const foraDoHorario = funcionamento.motivoFechado === 'FORA_DO_HORARIO'
  const semEntregaHoje = !funcionamento.entregaHoje
  const prontoIndisponivel = foraDoHorario || (tipo === 'ENTREGA' && semEntregaHoje)
  const menorHorario = new Date()
  if (tipo === 'ENTREGA' && semEntregaHoje) {
    menorHorario.setDate(menorHorario.getDate() + 1)
    menorHorario.setHours(0, 0, 0, 0)
  }

  function escolherTipo(novo: TipoEntrega) {
    setTipo(novo)
    if (novo === 'ENTREGA' && semEntregaHoje && quando === 'pronto') setQuando('agendar')
  }

  function bump(delta: number) {
    if (!qtdOk) return setQtdText(String(valores.quantidadeMinima))
    setQtdText(String(Math.min(valores.quantidadeMaxima, Math.max(valores.quantidadeMinima, qtd + delta))))
  }

  function changeFlavor(id: number, delta: number) {
    setSelecao((prev) => {
      const next = Math.max(0, (prev[id] ?? 0) + delta)
      const copy = { ...prev, [id]: next }
      if (next === 0) delete copy[id]
      return copy
    })
  }

  function setFlavorQty(id: number, text: string) {
    const n = Number(text.replace(/\D/g, ''))
    setSelecao((prev) => {
      const copy = { ...prev, [id]: n }
      if (!n) delete copy[id]
      return copy
    })
  }

  function toggleFlavor(id: number) {
    setEscolhidos((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function valorTroco() {
    const n = Number(trocoText.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, ''))
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0
  }

  function validar(): Erros {
    const e: Erros = {}
    if (!qtdOk) e.quantidade = `Escolha de ${valores.quantidadeMinima} a ${valores.quantidadeMaxima} unidades, de ${valores.passo} em ${valores.passo}.`
    if (!modoSabores) e.sabores = 'Escolha como quer os sabores.'
    else if (modoSabores === 'quantidades') {
      if (somaSabores === 0) e.sabores = 'Defina a quantidade de ao menos um sabor.'
      else if (qtdOk && somaSabores !== qtd) e.sabores = `A soma dos sabores (${somaSabores}) deve ser igual a ${qtd}.`
    } else if (modoSabores === 'selecao' && escolhidos.length === 0) {
      e.sabores = 'Marque ao menos um sabor.'
    }
    if (!tipo) e.tipoEntrega = 'Escolha entrega ou retirada.'
    if (tipo === 'ENTREGA' && endereco.trim().length < 5) e.endereco = 'Informe o endereço de entrega.'
    if (!quando) e.quando = 'Escolha quando quer receber.'
    else if (quando === 'pronto' && prontoIndisponivel) {
      e.quando = foraDoHorario
        ? `Estamos fora do horário de atendimento (${horarioAtendimento}). Agende para um horário dentro do atendimento.`
        : 'Hoje não estamos fazendo entregas. Agende para outro dia ou escolha retirada.'
    }
    if (nome.trim().length < 2) e.nomeCliente = 'Informe seu nome.'
    if (!/^\d{10,11}$/.test(telefone.replace(/\D/g, ''))) e.telefone = 'Informe um telefone com DDD.'
    if (!pagamento) e.formaPagamento = 'Escolha a forma de pagamento.'
    if (pagamento === 'DINHEIRO' && precisaTroco) {
      const valor = valorTroco()
      if (!valor) e.trocoPara = 'Informe para quanto você precisa de troco (ex.: 100).'
      else if (preco && valor <= preco.total) e.trocoPara = `O valor deve ser maior que o total do pedido (${formatPrice(preco.total)}).`
    }
    if (quando === 'agendar') {
      if (!horario) e.horarioAgendado = 'Escolha a data e o horário.'
      else if (new Date(horario).getTime() <= Date.now()) e.horarioAgendado = 'O horário escolhido deve ser no futuro.'
      else {
        const erro = erroDeAgendamento(funcionamento, tipo, new Date(horario))
        if (erro) e.horarioAgendado = erro
      }
    }
    return e
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault()
    setErroGeral('')
    const e = validar()
    setErros(e)
    if (Object.keys(e).length || !tipo || !pagamento) {
      if (Object.keys(e).length) {
        setErroGeral('Confira os campos destacados no formulário.')
        requestAnimationFrame(() => document.querySelector('.field__error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
      }
      return
    }

    const body: CriarPedidoBody = {
      nomeCliente: nome.trim(),
      telefone: telefone.replace(/\D/g, ''),
      quantidade: qtd,
      sabores:
        modoSabores === 'quantidades'
          ? Object.entries(selecao).map(([id, q]) => ({ saborId: Number(id), quantidade: q }))
          : modoSabores === 'selecao'
            ? escolhidos.map((id) => ({ saborId: id }))
            : [],
      tipoEntrega: tipo,
      endereco: tipo === 'ENTREGA' ? endereco.trim() : undefined,
      pontoReferencia: tipo === 'ENTREGA' && pontoReferencia.trim() ? pontoReferencia.trim() : undefined,
      observacao: observacao.trim() || undefined,
      horarioAgendado: quando === 'agendar' ? new Date(horario).toISOString() : undefined,
      formaPagamento: pagamento,
      ...(pagamento === 'DINHEIRO' && { precisaTroco, trocoPara: precisaTroco ? valorTroco() : undefined }),
    }

    setEnviando(true)
    try {
      const pedido = await api.criarPedido(body)
      navigate(`/pedido/${pedido.codigo}`, { state: { novo: true } })
    } catch (err) {
      if (err instanceof ApiError && err.erros.length) {
        const mapped: Erros = {}
        for (const item of err.erros) mapped[item.campo.split('.')[0]] ??= item.mensagem
        setErros(mapped)
      }
      setErroGeral(err instanceof Error ? err.message : 'Não foi possível enviar o pedido.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="page-columns">
      <div className="stack">
        <section className="section">
          <h2 className="section__title"><span className="section__step">1</span> Quantas unidades?</h2>
          <p className="section__hint">Mini salgados em múltiplos de {valores.passo}. Quanto maior o pedido, menor o preço por unidade.</p>
          <div className="qty">
            <Button type="button" variant="outline" size="icon-lg" aria-label={`Diminuir ${valores.passo} unidades`} onClick={() => bump(-valores.passo)}>
              <Minus />
            </Button>
            <Input
              inputMode="numeric"
              value={qtdText}
              onChange={(e) => setQtdText(e.target.value.replace(/\D/g, ''))}
              aria-label="Quantidade de unidades"
              aria-invalid={!!erros.quantidade || (qtdText !== '' && !qtdOk)}
              className="qty__input"
            />
            <Button type="button" variant="outline" size="icon-lg" aria-label={`Aumentar ${valores.passo} unidades`} onClick={() => bump(valores.passo)}>
              <Plus />
            </Button>
            <span className="qty__unit">unidades</span>
          </div>
          <div className="chip-row mt-3">
            {QUICK_QUANTITIES.filter((q) => q >= valores.quantidadeMinima && q <= valores.quantidadeMaxima).map((q) => (
              <button key={q} type="button" className="chip" aria-pressed={qtdOk && qtd === q} onClick={() => setQtdText(String(q))}>
                {q}
              </button>
            ))}
          </div>
          {(erros.quantidade || (qtdText !== '' && !qtdOk)) && (
            <p className="field__error mt-2">
              Escolha de {valores.quantidadeMinima} a {valores.quantidadeMaxima} unidades, de {valores.passo} em {valores.passo}.
            </p>
          )}
        </section>

        <section className="section">
          <h2 className="section__title"><span className="section__step">2</span> Sabores</h2>
          <p className="section__hint">Deixe misto, diga a quantidade de cada sabor ou só marque os sabores que você quer.</p>
          <div className="option-grid option-grid--3">
            <button type="button" className="option" aria-pressed={modoSabores === 'misto'} onClick={() => setModoSabores('misto')}>
              <span className="option__title">Misto</span>
              <span className="option__desc">A gente monta uma variedade de todos os sabores para você.</span>
            </button>
            <button type="button" className="option" aria-pressed={modoSabores === 'selecao'} onClick={() => setModoSabores('selecao')}>
              <span className="option__title">Só escolher os sabores</span>
              <span className="option__desc">Você marca os sabores e a gente divide as unidades entre eles.</span>
            </button>
            <button type="button" className="option" aria-pressed={modoSabores === 'quantidades'} onClick={() => setModoSabores('quantidades')}>
              <span className="option__title">Definir a quantidade</span>
              <span className="option__desc">Você diz quantas unidades quer de cada sabor.</span>
            </button>
          </div>
          {!modoSabores && erros.sabores && <p className="field__error mt-2">{erros.sabores}</p>}

          {modoSabores === 'quantidades' && (
            <>
              <ul className="flavor-list">
                {sabores.map((s) => {
                  const q = selecao[s.id] ?? 0
                  return (
                    <li key={s.id} className="flavor" data-active={q > 0}>
                      <span className="flavor__name">{s.nome}</span>
                      <div className="flavor__controls">
                        <Button type="button" variant="outline" size="icon-sm" aria-label={`Menos ${s.nome}`} disabled={q === 0} onClick={() => changeFlavor(s.id, -1)}>
                          <Minus />
                        </Button>
                        <Input
                          inputMode="numeric"
                          className="flavor__input"
                          value={q === 0 ? '' : String(q)}
                          placeholder="0"
                          maxLength={4}
                          aria-label={`Quantidade de ${s.nome}`}
                          onChange={(e) => setFlavorQty(s.id, e.target.value)}
                        />
                        <Button type="button" variant="outline" size="icon-sm" aria-label={`Mais ${s.nome}`} disabled={qtdOk && restante <= 0} onClick={() => changeFlavor(s.id, 1)}>
                          <Plus />
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
              <p className="flavor-progress" data-state={!qtdOk ? undefined : restante === 0 ? 'ok' : restante < 0 ? 'over' : undefined}>
                {!qtdOk
                  ? 'Defina a quantidade do pedido primeiro.'
                  : restante === 0
                    ? `Tudo certo: ${qtd} de ${qtd} unidades.`
                    : restante > 0
                      ? `Faltam ${restante} unidades para completar ${qtd}.`
                      : `Você passou ${-restante} unidades do total de ${qtd}.`}
              </p>
              {erros.sabores && <p className="field__error mt-1">{erros.sabores}</p>}
            </>
          )}

          {modoSabores === 'selecao' && (
            <>
              <div className="flavor-picker__bar">
                <span className="flavor-progress" data-state={escolhidos.length > 0 ? 'ok' : undefined}>
                  {escolhidos.length === 0
                    ? 'Marque ao menos um sabor.'
                    : `${escolhidos.length} ${escolhidos.length === 1 ? 'sabor escolhido' : 'sabores escolhidos'}.`}
                </span>
                <div className="flavor-picker__actions">
                  <button type="button" className="flavor-picker__link" onClick={() => setEscolhidos(sabores.map((s) => s.id))}>
                    Marcar todos
                  </button>
                  <button type="button" className="flavor-picker__link" disabled={escolhidos.length === 0} onClick={() => setEscolhidos([])}>
                    Limpar
                  </button>
                </div>
              </div>
              <ul className="flavor-picker">
                {sabores.map((s) => (
                  <li key={s.id}>
                    <button type="button" className="option flavor-picker__item" aria-pressed={escolhidos.includes(s.id)} onClick={() => toggleFlavor(s.id)}>
                      <span className="option__title">
                        {escolhidos.includes(s.id) && <Check className="size-4" />} {s.nome}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {erros.sabores && <p className="field__error mt-2">{erros.sabores}</p>}
            </>
          )}
        </section>

        <section className="section">
          <h2 className="section__title"><span className="section__step">3</span> Entrega ou retirada</h2>
          <div className="option-grid">
            <button type="button" className="option" aria-pressed={tipo === 'ENTREGA'} onClick={() => escolherTipo('ENTREGA')}>
              <span className="option__title"><Truck className="size-4" /> Entrega</span>
              <span className="option__desc">
                {taxas.entregaGratisAPartirDe}+ unidades: grátis. Até 49: {formatPrice(taxas.taxaAte49)}. De 50 a {taxas.entregaGratisAPartirDe - 1}: {formatPrice(taxas.taxaDe50a199)}.
                {semEntregaHoje && <strong className="option__aviso"> Hoje não: só agendando para outro dia.</strong>}
              </span>
            </button>
            <button type="button" className="option" aria-pressed={tipo === 'RETIRADA'} onClick={() => escolherTipo('RETIRADA')}>
              <span className="option__title"><Store className="size-4" /> Retirada no local</span>
              <span className="option__desc">Sem taxa. Você busca com a gente.</span>
              {funcionamento.enderecoRetirada && (
                <span className="option__desc flex items-start gap-1 font-medium text-foreground">
                  <MapPin className="mt-0.5 size-3.5 shrink-0" /> {funcionamento.enderecoRetirada}
                </span>
              )}
            </button>
          </div>
          {erros.tipoEntrega && <p className="field__error mt-2">{erros.tipoEntrega}</p>}
          {tipo === 'ENTREGA' && (
            <div className="field mt-4">
              <Label htmlFor="endereco">Endereço de entrega</Label>
              <Input id="endereco" value={endereco} onChange={(e) => setEndereco(e.target.value)} autoComplete="street-address" placeholder="Rua, número, bairro" aria-invalid={!!erros.endereco} />
              {erros.endereco && <p className="field__error">{erros.endereco}</p>}
            </div>
          )}
          {tipo === 'ENTREGA' && (
            <div className="field mt-3">
              <Label htmlFor="referencia">Ponto de referência <span className="field__optional">(opcional)</span></Label>
              <Input id="referencia" value={pontoReferencia} onChange={(e) => setPontoReferencia(e.target.value)} maxLength={200} placeholder="Ex.: portão azul, perto da padaria" aria-invalid={!!erros.pontoReferencia} />
              {erros.pontoReferencia && <p className="field__error">{erros.pontoReferencia}</p>}
            </div>
          )}

          <h3 className="mt-5 mb-2 text-sm font-medium">{tipo === 'ENTREGA' ? 'Entregar' : tipo === 'RETIRADA' ? 'Retirar' : 'Receber'} quando?</h3>
          <div className="option-grid">
            <button type="button" className="option" aria-pressed={quando === 'pronto'} disabled={prontoIndisponivel} onClick={() => setQuando('pronto')}>
              <span className="option__title"><Clock className="size-4" /> {QUANDO_PRONTO}</span>
              <span className="option__desc">
                {foraDoHorario
                  ? 'Indisponível agora: estamos fora do horário de atendimento.'
                  : prontoIndisponivel
                    ? 'Indisponível para entrega hoje. Agende para outro dia.'
                    : `Para quando finalizar o preparo (${tempo.minimoMin} a ${tempo.maximoMin} min).`}
              </span>
            </button>
            <button type="button" className="option" aria-pressed={quando === 'agendar'} onClick={() => setQuando('agendar')}>
              <span className="option__title"><CalendarClock className="size-4" /> Data e hora específicas</span>
              <span className="option__desc">Escolha o dia e o horário.</span>
            </button>
          </div>
          {erros.quando && <p className="field__error mt-2">{erros.quando}</p>}
          {quando === 'agendar' && (
            <div className="field mt-3">
              <Label htmlFor="horario">Data e horário</Label>
              <Input id="horario" type="datetime-local" value={horario} min={toLocalInputValue(menorHorario)} onChange={(e) => setHorario(e.target.value)} aria-invalid={!!erros.horarioAgendado} />
              {erros.horarioAgendado ? (
                <p className="field__error">{erros.horarioAgendado}</p>
              ) : (
                (horarioAtendimento || (tipo === 'ENTREGA' && semEntregaHoje)) && (
                  <p className="field__hint">
                    {[
                      horarioAtendimento && `Atendimento ${horarioAtendimento}.`,
                      tipo === 'ENTREGA' && semEntregaHoje && 'Entregas a partir de amanhã.',
                    ].filter(Boolean).join(' ')}
                  </p>
                )
              )}
            </div>
          )}
        </section>

        <section className="section">
          <h2 className="section__title"><span className="section__step">4</span> Seus dados</h2>
          <div className="stack mt-3">
            <div className="field">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" aria-invalid={!!erros.nomeCliente} />
              {erros.nomeCliente && <p className="field__error">{erros.nomeCliente}</p>}
            </div>
            <div className="field">
              <Label htmlFor="telefone">Telefone / WhatsApp</Label>
              <Input id="telefone" type="tel" inputMode="tel" value={telefone} onChange={(e) => setTelefone(formatPhone(e.target.value))} autoComplete="tel" placeholder="(11) 99999-9999" aria-invalid={!!erros.telefone} />
              {erros.telefone && <p className="field__error">{erros.telefone}</p>}
            </div>
          </div>
        </section>

        <section className="section">
          <h2 className="section__title"><span className="section__step">5</span> Pagamento</h2>
          <div className={cn('option-grid mt-3', formasPagamento.length === 3 && 'option-grid--3')}>
            {formasPagamento.map((f) => (
              <button key={f} type="button" className="option" aria-pressed={pagamento === f} onClick={() => setPagamento(f)}>
                <span className="option__title">{paymentLabels[f]}</span>
                <span className="option__desc">{paymentDescriptions[f]}</span>
              </button>
            ))}
          </div>
          {erros.formaPagamento && <p className="field__error mt-2">{erros.formaPagamento}</p>}
          {pagamento === 'DINHEIRO' && (
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-medium">Precisa de troco?</h3>
              <div className="option-grid">
                <button type="button" className="option" aria-pressed={!precisaTroco} onClick={() => setPrecisaTroco(false)}>
                  <span className="option__title">Não</span>
                  <span className="option__desc">Vou pagar o valor exato.</span>
                </button>
                <button type="button" className="option" aria-pressed={precisaTroco} onClick={() => setPrecisaTroco(true)}>
                  <span className="option__title">Sim</span>
                  <span className="option__desc">Informe com qual nota vai pagar.</span>
                </button>
              </div>
              {precisaTroco && (
                <div className="field mt-3">
                  <Label htmlFor="troco">Troco para quanto?</Label>
                  <Input
                    id="troco"
                    inputMode="decimal"
                    value={trocoText}
                    onChange={(ev) => setTrocoText(ev.target.value.replace(/[^\d,.]/g, ''))}
                    onBlur={() => {
                      const v = valorTroco()
                      if (v) setTrocoText(v.toFixed(2).replace('.', ','))
                    }}
                    maxLength={10}
                    placeholder="Ex.: 50 ou 100"
                    aria-invalid={!!erros.trocoPara}
                  />
                  {erros.trocoPara ? <p className="field__error">{erros.trocoPara}</p> : <p className="field__hint">Pode digitar só o número (ex.: 100); os centavos entram automaticamente.</p>}
                </div>
              )}
            </div>
          )}
          {pagamento === 'PIX' && (
            <div className="alert alert--info mt-3 grid gap-1">
              <p>Depois de enviar o pedido você verá a chave Pix para copiar, o valor e o botão para enviar o comprovante por WhatsApp.</p>
              <p className="font-medium">
                {textoPrazoPix(
                  previaPrazoPix(quando === 'agendar' && horario ? new Date(horario) : null, qtdOk ? qtd : 0, pix.antecedencia),
                  formatDateTime,
                )}
              </p>
            </div>
          )}
        </section>

        <section className="section">
          <h2 className="section__title"><span className="section__step">6</span> Observações <span className="field__optional">(opcional)</span></h2>
          <div className="field">
            <Label htmlFor="observacao" className="sr-only">Observações</Label>
            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Ex.: sem pimenta, tocar a campainha, alergia a camarão..."
              aria-invalid={!!erros.observacao}
            />
            {erros.observacao ? <p className="field__error">{erros.observacao}</p> : <p className="field__hint">{observacao.length}/500</p>}
          </div>
        </section>
      </div>

      <aside className="summary">
        <h2 className="summary__title"><ShoppingBag className="size-5" /> Resumo do pedido</h2>
        <dl className="summary__rows">
          <div className="summary__row">
            <dt>Unidades</dt>
            <dd>
              {qtdOk
                ? `${qtd}${modoSabores === 'misto' ? ' (misto)' : nSabores > 0 ? ` (${nSabores} ${nSabores === 1 ? 'sabor' : 'sabores'})` : ''}`
                : '—'}
            </dd>
          </div>
          <div className="summary__row">
            <dt>Subtotal</dt>
            <dd>{subtotal !== null ? formatPrice(subtotal) : '—'}</dd>
          </div>
          <div className="summary__row">
            <dt>{tipo === 'ENTREGA' ? 'Entrega' : tipo === 'RETIRADA' ? 'Retirada' : 'Entrega ou retirada'}</dt>
            <dd>{!preco ? '—' : preco.taxa === 0 ? 'Grátis' : formatPrice(preco.taxa)}</dd>
          </div>
          <div className="summary__row summary__row--total">
            <dt>Total</dt>
            <dd>{preco ? formatPrice(preco.total) : '—'}</dd>
          </div>
        </dl>
        {tipo === 'ENTREGA' && qtdOk && faltaParaGratis > 0 && (
          <p className="summary__note">Faltam {faltaParaGratis} unidades para a entrega ser grátis.</p>
        )}
        <p className="summary__note flex items-center gap-1.5">
          <Clock className="size-3.5" /> Preparo em {tempo.minimoMin} a {tempo.maximoMin} min.
        </p>
        {erroGeral && <p role="alert" className="alert alert--error mb-3">{erroGeral}</p>}
        <Button type="submit" size="lg" className="h-11 w-full text-base" disabled={enviando}>
          {enviando ? 'Enviando...' : `Fazer pedido${preco ? ` · ${formatPrice(preco.total)}` : ''}`}
        </Button>
        <p className="summary__note mt-2 text-center">O valor final é confirmado pelo sistema ao enviar.</p>
      </aside>
    </form>
  )
}

function AvisoFuncionamento({ f }: { f: Funcionamento }) {
  const horario = textoHorario(f)

  if (f.motivoFechado === 'FECHADO_MANUAL') {
    return (
      <div role="status" className="alert alert--error aviso">
        <p className="aviso__title"><Store className="size-4" /> Estamos fechados no momento</p>
        <p>Não estamos aceitando pedidos agora. {horario ? `Nosso atendimento é ${horario}. ` : ''}Volte em breve!</p>
      </div>
    )
  }

  return (
    <>
      {f.motivoFechado === 'FORA_DO_HORARIO' && (
        <div role="status" className="alert alert--info aviso">
          <p className="aviso__title"><Clock className="size-4" /> Fora do horário de atendimento</p>
          <p>Nosso atendimento é {horario}. Você pode fazer o pedido agendando um horário dentro do atendimento.</p>
        </div>
      )}
      {!f.entregaHoje && (
        <div role="status" className="alert alert--info aviso">
          <p className="aviso__title"><Truck className="size-4" /> Hoje só temos retirada</p>
          <p>Para receber em casa, agende a entrega para outro dia.</p>
        </div>
      )}
    </>
  )
}

export default function OrderPage() {
  const catalogo = useFetch(api.catalogo, [])

  return (
    <>
      <AvisoEntrega />
      <SiteHeader whatsapp={catalogo.data?.pix.whatsapp} />
      <main className="page">
        <section className="hero">
          {catalogo.data && (
            <p role="status" className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <span
                aria-hidden="true"
                className={`inline-block size-3 rounded-full border-2 border-black ${catalogo.data.funcionamento.aberto ? 'bg-green-500' : 'bg-red-500'}`}
              />
              {catalogo.data.funcionamento.aberto ? 'Aberto' : 'Fechado'}
            </p>
          )}
          <p className="hero__eyebrow">
            <Clock className="size-4" />
            {catalogo.data
              ? `Preparo em ${catalogo.data.tempo.minimoMin} a ${catalogo.data.tempo.maximoMin} min`
              : 'Mini salgados feitos com carinho'}
          </p>
          <p className="hero__aviso">
            <MapPinCheck className="size-4 shrink-0" /> Entregas apenas em Paiçandu, PR
          </p>
          <p className="hero__text font-semibold">Escolha a quantidade, os sabores e como quer receber. A gente cuida do resto!</p>
          <TrackOrder />
          <p className="hero__aviso mt-4 mb-0!"><Info className="size-4 shrink-0" /> Se precisar falar conosco, clique no botão de WhatsApp acima.</p>
        </section>

        {catalogo.loading && !catalogo.data ? (
          <LoadingState label="Carregando cardápio..." />
        ) : catalogo.data ? (
          <>
            <AvisoFuncionamento f={catalogo.data.funcionamento} />
            {catalogo.data.funcionamento.motivoFechado !== 'FECHADO_MANUAL' && <OrderForm catalogo={catalogo.data} />}
          </>
        ) : (
          <ErrorState error={catalogo.error} onRetry={catalogo.reload} title="Não conseguimos abrir o cardápio" />
        )}
      </main>
    </>
  )
}
