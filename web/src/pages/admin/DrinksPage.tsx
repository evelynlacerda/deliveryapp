import { useEffect, useRef, useState } from 'react'
import { Check, GlassWater, ImagePlus, Pencil, Plus, Trash2, X } from 'lucide-react'
import { FormStatus } from '@/components/form-status'
import { ErrorState, LoadingState } from '@/components/state-views'
import { Switch } from '@/components/switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useFetch } from '@/hooks/use-fetch'
import { api, bebidaFotoUrl } from '@/lib/api'
import { formatPrice, hasMaxTwoDecimals, moneyToInput, parseMoney } from '@/lib/format'
import { FOTO_MAX_KB, prepararFoto, type FotoPreparada } from '@/lib/foto'
import type { Bebida } from '@/types/types'

function Foto({ bebida }: { bebida: Bebida }) {
  return (
    <div className="drink__photo">
      {bebida.fotoVersao ? (
        <img src={bebidaFotoUrl(bebida.id, bebida.fotoVersao)} alt={`Foto de ${bebida.nome}`} loading="lazy" />
      ) : (
        <GlassWater className="size-6" />
      )}
    </div>
  )
}

// Formulário de nova bebida e de edição (mesmos campos): foto, nome e preço.
function DrinkForm({
  bebida,
  onSaved,
  onCancel,
}: {
  bebida?: Bebida
  /** `aviso` vem preenchido quando a bebida foi salva, mas a foto não. */
  onSaved: (bebida: Bebida, aviso?: string) => void
  onCancel: () => void
}) {
  const [nome, setNome] = useState(bebida?.nome ?? '')
  const [preco, setPreco] = useState(bebida ? moneyToInput(bebida.preco) : '')
  const [foto, setFoto] = useState<FotoPreparada | null>(null)
  const [removerFoto, setRemoverFoto] = useState(false)
  const [lendo, setLendo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const inputArquivo = useRef<HTMLInputElement>(null)
  const idCampo = `bebida-${bebida?.id ?? 'nova'}`

  // Libera a prévia local ao trocar de foto ou fechar o formulário.
  useEffect(() => {
    const anterior = foto?.previa
    return () => { if (anterior) URL.revokeObjectURL(anterior) }
  }, [foto])

  async function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    setLendo(true)
    setErro('')
    try {
      setFoto(await prepararFoto(arquivo))
      setRemoverFoto(false)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível usar essa foto.')
    } finally {
      setLendo(false)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const nomeLimpo = nome.trim()
    const valor = parseMoney(preco)
    if (nomeLimpo.length < 2) return setErro('O nome precisa ter ao menos 2 caracteres.')
    if (valor === null || valor <= 0) return setErro('Informe o preço, por exemplo 12,00.')
    if (!hasMaxTwoDecimals(valor)) return setErro('Use no máximo 2 casas decimais no preço.')
    if (valor > 1000) return setErro('O preço deve ser de no máximo R$ 1.000,00.')

    setSaving(true)
    setErro('')
    let atual: Bebida | undefined
    try {
      if (!bebida) {
        atual = await api.criarBebida({ nome: nomeLimpo, preco: valor })
      } else if (nomeLimpo !== bebida.nome || valor !== Number(bebida.preco)) {
        atual = await api.atualizarBebida(bebida.id, { nome: nomeLimpo, preco: valor })
      } else {
        atual = bebida
      }
    } catch (err) {
      setSaving(false)
      return setErro(err instanceof Error ? err.message : 'Não foi possível salvar a bebida.')
    }

    // A bebida já está salva: um problema na foto não deve desfazer isso.
    let aviso: string | undefined
    try {
      if (foto) atual = await api.enviarFotoBebida(atual.id, foto.tipo, foto.dados)
      else if (removerFoto && atual.fotoVersao !== null) atual = await api.removerFotoBebida(atual.id)
    } catch (err) {
      aviso = `A bebida foi salva, mas a foto não: ${err instanceof Error ? err.message : 'tente enviar de novo.'}`
    }
    setSaving(false)
    onSaved(atual, aviso)
  }

  const previa = foto?.previa ?? (!removerFoto && bebida?.fotoVersao ? bebidaFotoUrl(bebida.id, bebida.fotoVersao) : null)

  return (
    <form onSubmit={submit} className="drink-form" noValidate>
      <div className="drink-form__photo">
        <div className="drink__photo drink__photo--large" data-vazio={!previa}>
          {previa ? <img src={previa} alt="Prévia da foto da bebida" /> : <GlassWater className="size-8" />}
        </div>
        <input ref={inputArquivo} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={aoEscolherArquivo} aria-label="Escolher foto da bebida" />
        <div className="drink-form__photo-actions">
          <Button type="button" variant="outline" size="sm" disabled={lendo || saving} onClick={() => inputArquivo.current?.click()}>
            <ImagePlus /> {lendo ? 'Preparando...' : previa ? 'Trocar foto' : 'Enviar foto'}
          </Button>
          {previa && (
            <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={() => { setFoto(null); setRemoverFoto(true) }}>
              <Trash2 /> Remover
            </Button>
          )}
        </div>
        <p className="field__hint">PNG, JPG ou WebP. Reduzimos a imagem para até {FOTO_MAX_KB} KB automaticamente.</p>
      </div>

      <div className="drink-form__fields">
        <div className="field">
          <Label htmlFor={`${idCampo}-nome`}>Nome</Label>
          <Input id={`${idCampo}-nome`} value={nome} maxLength={80} placeholder="Ex.: Coca-cola 2L Original" onChange={(e) => { setNome(e.target.value); setErro('') }} autoFocus={!bebida} />
        </div>
        <div className="field">
          <Label htmlFor={`${idCampo}-preco`}>Preço (R$)</Label>
          <Input id={`${idCampo}-preco`} value={preco} inputMode="decimal" placeholder="12,00" onChange={(e) => { setPreco(e.target.value); setErro('') }} />
        </div>
        <div className="form-actions">
          <Button type="submit" disabled={saving || lendo}>
            <Check /> {saving ? 'Salvando...' : bebida ? 'Salvar' : 'Incluir bebida'}
          </Button>
          <Button type="button" variant="outline" disabled={saving} onClick={onCancel}>
            <X /> Cancelar
          </Button>
        </div>
        {erro && <p role="alert" className="alert alert--error">{erro}</p>}
      </div>
    </form>
  )
}

function DrinkRow({
  bebida,
  onChange,
  onDeleted,
  onMessage,
}: {
  bebida: Bebida
  onChange: (b: Bebida) => void
  onDeleted: (id: number) => void
  onMessage: (msg: string) => void
}) {
  const [editando, setEditando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [busy, setBusy] = useState(false)

  async function agir(acao: () => Promise<void>, falha: string) {
    setBusy(true)
    onMessage('')
    try {
      await acao()
    } catch (err) {
      onMessage(err instanceof Error ? err.message : falha)
    } finally {
      setBusy(false)
    }
  }

  if (editando) {
    return (
      <li className="drink drink--editing">
        <DrinkForm
          bebida={bebida}
          onCancel={() => setEditando(false)}
          onSaved={(atualizada, aviso) => {
            onChange(atualizada)
            onMessage(aviso ?? '')
            setEditando(false)
          }}
        />
      </li>
    )
  }

  return (
    <li className="drink" data-active={bebida.ativo}>
      <Foto bebida={bebida} />
      <div className="drink__body">
        <p className="drink__name">
          {bebida.nome}
          {!bebida.ativo && <Badge variant="secondary">Desativada</Badge>}
        </p>
        <p className="drink__price">{formatPrice(bebida.preco)}</p>
      </div>
      {confirmando ? (
        <div className="drink__confirm" role="alertdialog" aria-label={`Excluir ${bebida.nome}`}>
          <p>Excluir esta bebida? Não dá para desfazer.</p>
          <div className="drink__actions">
            <Button
              variant="destructive"
              size="sm"
              disabled={busy}
              onClick={() => agir(async () => { await api.excluirBebida(bebida.id); onDeleted(bebida.id) }, 'Não foi possível excluir a bebida.')}
            >
              <Trash2 /> {busy ? 'Excluindo...' : 'Sim, excluir'}
            </Button>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => setConfirmando(false)}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <div className="drink__actions">
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => setEditando(true)}><Pencil /> Editar</Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => agir(async () => onChange(await api.atualizarBebida(bebida.id, { ativo: !bebida.ativo })), 'Não foi possível salvar.')}
          >
            {bebida.ativo ? 'Desativar' : 'Ativar'}
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirmando(true)}><Trash2 /> Excluir</Button>
        </div>
      )}
    </li>
  )
}

function VendaToggle({ ativa, onChange }: { ativa: boolean; onChange: (ativa: boolean) => void }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  async function alterar(valor: boolean) {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      onChange((await api.salvarVendaBebidas(valor)).vendaAtiva)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="section">
      <div className="switch-row switch-row--first">
        <div>
          <Label htmlFor="venda-bebidas">Vender bebidas no app</Label>
          <p className="field__hint">
            Desligado, nenhuma bebida aparece para o cliente, mesmo as ativas. Vale na hora, sem precisar salvar.
          </p>
        </div>
        <Switch id="venda-bebidas" checked={ativa} disabled={saving} onChange={alterar} />
      </div>
      <FormStatus error={error} saved={saved} />
    </section>
  )
}

export default function DrinksPage() {
  const dados = useFetch(api.bebidasAdmin, [])
  const [criando, setCriando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  const lista = dados.data?.bebidas ?? []
  const ativas = lista.filter((b) => b.ativo).length
  const mutarLista = (fn: (l: Bebida[]) => Bebida[]) => dados.mutate((d) => ({ ...d, bebidas: fn(d.bebidas) }))

  return (
    <div className="admin-content max-w-3xl">
      <div className="page-head">
        <div>
          <h2 className="page-head__title">Bebidas</h2>
          <p className="page-head__text">
            Cadastre as bebidas à venda, com foto e preço. Bebidas desativadas deixam de aparecer para o cliente, e as excluídas somem de vez.
          </p>
        </div>
        {!criando && dados.data && (
          <Button onClick={() => { setCriando(true); setMensagem('') }}><Plus /> Incluir nova bebida</Button>
        )}
      </div>

      {dados.loading && !dados.data ? (
        <LoadingState label="Carregando bebidas..." />
      ) : !dados.data ? (
        <ErrorState error={dados.error} onRetry={dados.reload} title="Não conseguimos carregar as bebidas" />
      ) : (
        <>
          <VendaToggle ativa={dados.data.vendaAtiva} onChange={(vendaAtiva) => dados.mutate((d) => ({ ...d, vendaAtiva }))} />

          {criando && (
            <section className="section" aria-label="Nova bebida">
              <h3 className="section__title mb-3">Nova bebida</h3>
              <DrinkForm
                onCancel={() => setCriando(false)}
                onSaved={(criada, aviso) => {
                  mutarLista((l) => [...l, criada])
                  setMensagem(aviso ?? '')
                  setCriando(false)
                }}
              />
            </section>
          )}

          {mensagem && <p role="alert" className="alert alert--error">{mensagem}</p>}

          <section aria-label="Lista de bebidas" className="stack">
            {lista.length === 0 ? (
              <p className="drinks-empty">Nenhuma bebida cadastrada ainda. Use “Incluir nova bebida” para começar.</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{ativas} ativas de {lista.length}.</p>
                <ul className="drinks">
                  {lista.map((b) => (
                    <DrinkRow
                      key={b.id}
                      bebida={b}
                      onMessage={setMensagem}
                      onChange={(atualizada) => mutarLista((l) => l.map((x) => (x.id === atualizada.id ? atualizada : x)))}
                      onDeleted={(id) => mutarLista((l) => l.filter((x) => x.id !== id))}
                    />
                  ))}
                </ul>
              </>
            )}
          </section>
        </>
      )}
    </div>
  )
}
