import { useRef, useState, type ChangeEvent, type CSSProperties } from 'react'
import { ImagePlus, RotateCcw, Trash2 } from 'lucide-react'
import { FormStatus } from '@/components/form-status'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useBrand } from '@/context/brand'
import { useSave } from '@/hooks/use-save'
import { api, logoUrl } from '@/lib/api'
import type { ModoLogo } from '@/lib/logo'
import {
  CHAVES_ADMIN,
  CHAVES_PUBLICO,
  coresParaSalvar,
  corValida,
  ESCOPOS,
  MODOS,
  PADRAO,
  rascunhoDeCores,
  ROTULOS_COR,
  variaveisCss,
  type ChaveTema,
  type Escopo,
  type Modo,
  type Paleta,
} from '@/lib/tema'
import { cn } from '@/lib/utils'

const LOGO_MAX_KB = 300

function lerBase64(arquivo: File): Promise<string> {
  return new Promise((ok, falha) => {
    const leitor = new FileReader()
    leitor.onload = () => ok(String(leitor.result).split(',')[1] ?? '')
    leitor.onerror = () => falha(new Error('Não foi possível ler o arquivo.'))
    leitor.readAsDataURL(arquivo)
  })
}

function tipoDoArquivo(arquivo: File): 'image/png' | 'image/svg+xml' | null {
  const nome = arquivo.name.toLowerCase()
  if (arquivo.type === 'image/png' || nome.endsWith('.png')) return 'image/png'
  if (arquivo.type === 'image/svg+xml' || nome.endsWith('.svg')) return 'image/svg+xml'
  return null
}

function LogoBox({ modo }: { modo: ModoLogo }) {
  const { marca, atualizar } = useBrand()
  const save = useSave()
  const inputArquivo = useRef<HTMLInputElement>(null)
  const escuro = modo === 'escuro'
  const versao = escuro ? marca.logoEscuraVersao : marca.logoVersao

  async function aoEscolherArquivo(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return

    const tipo = tipoDoArquivo(arquivo)
    if (!tipo) return save.fail('Use um arquivo PNG ou SVG.')
    if (arquivo.size > LOGO_MAX_KB * 1024) return save.fail(`A logo deve ter no máximo ${LOGO_MAX_KB} KB.`)

    await save.run(async () => atualizar(await api.enviarLogo(tipo, await lerBase64(arquivo), modo)))
  }

  return (
    <div className="logo-box">
      <div className="logo-box__preview" data-modo={modo} aria-label={escuro ? 'Logo atual (modo escuro)' : 'Logo atual (modo claro)'}>
        {versao ? <img src={logoUrl(versao, modo)} alt={`Logo de ${marca.nome} (modo ${escuro ? 'escuro' : 'claro'})`} /> : <span>Sem logo</span>}
      </div>
      <div className="logo-box__body">
        <p className="logo-box__title">{escuro ? 'Logo do modo escuro' : 'Logo do modo claro'}</p>
        <p className="field__hint">
          {escuro
            ? `Para fundos escuros: use uma versão clara da logo. Aparece no modo escuro e sempre na barra lateral do painel. Sem ela, usamos a logo do modo claro. PNG ou SVG, até ${LOGO_MAX_KB} KB.`
            : `Aparece no modo claro (e no escuro, se você não enviar a logo do modo escuro). Fundo transparente funciona melhor. PNG ou SVG, até ${LOGO_MAX_KB} KB.`}
        </p>
        <input ref={inputArquivo} type="file" accept="image/png,image/svg+xml,.png,.svg" className="sr-only" onChange={aoEscolherArquivo} aria-label={`Escolher arquivo da logo do modo ${escuro ? 'escuro' : 'claro'}`} />
        <div className="logo-box__actions">
          <Button type="button" variant="outline" disabled={save.saving} onClick={() => inputArquivo.current?.click()}>
            <ImagePlus /> {save.saving ? 'Enviando...' : versao ? 'Trocar logo' : 'Enviar logo'}
          </Button>
          {versao && (
            <Button type="button" variant="ghost" disabled={save.saving} onClick={() => save.run(async () => atualizar(await api.removerLogo(modo)))}>
              <Trash2 /> Remover logo
            </Button>
          )}
        </div>
        <FormStatus error={save.error} saved={save.saved} />
      </div>
    </div>
  )
}

function MarcaSection() {
  const { marca, atualizar } = useBrand()
  const [nome, setNome] = useState(marca.nome)
  const [erroNome, setErroNome] = useState('')
  const nomeSave = useSave()

  async function salvarNome(e: React.FormEvent) {
    e.preventDefault()
    const limpo = nome.trim()
    if (limpo.length < 2) return setErroNome('O nome deve ter ao menos 2 caracteres.')
    setErroNome('')
    await nomeSave.run(async () => atualizar(await api.salvarMarca({ nome: limpo, cores: marca.cores })))
  }

  return (
    <section className="section">
      <h3 className="section__title">Marca</h3>
      <p className="section__hint">O nome aparece no topo do site, na aba do navegador e nas mensagens. Se você enviar uma logo, ela substitui o ícone e o nome. Dá para enviar uma logo para o modo claro e outra para o modo escuro.</p>

      <form onSubmit={salvarNome} className="stack" noValidate>
        <div className="field">
          <Label htmlFor="nome-marca">Nome da marca</Label>
          <Input id="nome-marca" value={nome} maxLength={60} disabled={marca.nomeBloqueado} onChange={(e) => { setNome(e.target.value); nomeSave.reset() }} aria-invalid={!!erroNome} />
          {marca.nomeBloqueado && <p className="field__hint">Nome fixo nesta demonstração, por segurança.</p>}
          {erroNome && <p className="field__error">{erroNome}</p>}
        </div>
        <div className="form-actions mt-0">
          <Button type="submit" disabled={nomeSave.saving || marca.nomeBloqueado}>{nomeSave.saving ? 'Salvando...' : 'Salvar nome'}</Button>
          <FormStatus error={nomeSave.error} saved={nomeSave.saved} />
        </div>
      </form>

      <LogoBox modo="claro" />
      <LogoBox modo="escuro" />
    </section>
  )
}

function PreviewTema({ escopo, modo, paleta }: { escopo: Escopo; modo: Modo; paleta: Paleta }) {
  const { marca } = useBrand()
  const estilo = variaveisCss(escopo, { ...PADRAO[modo], ...Object.fromEntries(Object.entries(paleta).filter(([, v]) => corValida(v))) } as Paleta) as CSSProperties

  return (
    <div className="tema-preview" style={estilo} data-escopo={escopo} aria-label="Pré-visualização">
      {escopo === 'admin' && (
        <div className="tema-preview__sidebar">
          <span className="tema-preview__logo" />
          <span className="tema-preview__nav" data-ativo="true" />
          <span className="tema-preview__nav" />
          <span className="tema-preview__nav" />
        </div>
      )}
      <div className="tema-preview__main">
        <div className="tema-preview__topo">{marca.nome}</div>
        <div className="tema-preview__hero">
          <strong>Título da página</strong>
          <span>Texto de apoio em cor secundária.</span>
        </div>
        <div className="tema-preview__card">
          <span className="tema-preview__passo">1</span>
          <span>Cartão com campo</span>
          <span className="tema-preview__campo">Digite aqui</span>
        </div>
        <div className="tema-preview__botoes">
          <span className="tema-preview__botao" data-tipo="primaria">Botão principal</span>
          <span className="tema-preview__botao" data-tipo="destaque">Destaque</span>
        </div>
      </div>
    </div>
  )
}

function CampoCor({ chave, valor, onChange }: { chave: ChaveTema; valor: string; onChange: (v: string) => void }) {
  const { rotulo, dica } = ROTULOS_COR[chave]
  const valido = corValida(valor)

  return (
    <div className="color-field">
      <Label htmlFor={`cor-${chave}`}>{rotulo}</Label>
      <div className="color-field__controls">
        <input
          type="color"
          className="color-field__picker"
          aria-label={`Escolher cor: ${rotulo}`}
          value={valido ? valor : '#000000'}
          onChange={(e) => onChange(e.target.value)}
        />
        <Input id={`cor-${chave}`} value={valor} maxLength={7} spellCheck={false} aria-invalid={!valido} onChange={(e) => onChange(e.target.value.trim().toLowerCase())} />
      </div>
      {valido ? <p className="field__hint">{dica}</p> : <p className="field__error">Use o formato #RRGGBB.</p>}
    </div>
  )
}

function CoresSection() {
  const { marca, atualizar } = useBrand()
  const [rascunho, setRascunho] = useState(() => rascunhoDeCores(marca.cores))
  const [escopo, setEscopo] = useState<Escopo>('publico')
  const [modo, setModo] = useState<Modo>('claro')
  const save = useSave()

  const paleta = rascunho[escopo][modo]
  const chaves = escopo === 'admin' ? CHAVES_ADMIN : CHAVES_PUBLICO
  const todasValidas = (['publico', 'admin'] as Escopo[]).every((e) =>
    (['claro', 'escuro'] as Modo[]).every((m) => (e === 'admin' ? CHAVES_ADMIN : CHAVES_PUBLICO).every((c) => corValida(rascunho[e][m][c]))),
  )

  function mudarCor(chave: ChaveTema, valor: string) {
    setRascunho((r) => ({ ...r, [escopo]: { ...r[escopo], [modo]: { ...r[escopo][modo], [chave]: valor } } }))
    save.reset()
  }

  function restaurarPaleta() {
    setRascunho((r) => ({ ...r, [escopo]: { ...r[escopo], [modo]: { ...PADRAO[modo] } } }))
    save.reset()
  }

  async function salvar() {
    if (!todasValidas) return save.fail('Corrija as cores destacadas (formato #RRGGBB).')
    await save.run(async () => atualizar(await api.salvarMarca({ nome: marca.nome, cores: coresParaSalvar(rascunho) })))
  }

  return (
    <section className="section">
      <h3 className="section__title">Cores</h3>
      <p className="section__hint">
        O aplicativo de pedidos (o que o cliente vê) e o painel do admin têm cores separadas, cada uma com modo claro e escuro. A cor do
        texto dentro de botões é escolhida automaticamente para ficar legível.
      </p>

      <div className="settings-tabs" role="group" aria-label="Onde aplicar">
        {ESCOPOS.map((e) => (
          <button key={e.id} type="button" className="chip" aria-pressed={escopo === e.id} onClick={() => setEscopo(e.id)}>
            {e.rotulo}
          </button>
        ))}
      </div>
      <div className="settings-tabs" role="group" aria-label="Modo de cor">
        {MODOS.map((m) => (
          <button key={m.id} type="button" className="chip" aria-pressed={modo === m.id} onClick={() => setModo(m.id)}>
            {m.rotulo}
          </button>
        ))}
      </div>

      <div className="settings-colors">
        <div className={cn('color-grid')}>
          {chaves.map((chave) => (
            <CampoCor key={`${escopo}-${modo}-${chave}`} chave={chave} valor={paleta[chave]} onChange={(v) => mudarCor(chave, v)} />
          ))}
        </div>
        <div className="settings-colors__preview">
          <p className="settings-colors__label">Pré-visualização</p>
          <PreviewTema escopo={escopo} modo={modo} paleta={paleta} />
          <Button type="button" variant="ghost" size="sm" onClick={restaurarPaleta}>
            <RotateCcw /> Restaurar padrão desta paleta
          </Button>
        </div>
      </div>

      <div className="form-actions">
        <Button type="button" disabled={save.saving} onClick={salvar}>{save.saving ? 'Salvando...' : 'Salvar cores'}</Button>
        <FormStatus error={save.error} saved={save.saved} />
      </div>
    </section>
  )
}

export default function SettingsPage() {
  return (
    <div className="admin-content max-w-4xl">
      <div className="page-head">
        <div>
          <h2 className="page-head__title">Configurações</h2>
          <p className="page-head__text">Nome, logo e cores do aplicativo de pedidos e do painel. As mudanças valem para todos assim que você salvar.</p>
        </div>
      </div>
      <MarcaSection />
      <CoresSection />
    </div>
  )
}
