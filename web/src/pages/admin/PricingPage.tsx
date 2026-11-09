import { useState } from 'react'
import { FormStatus } from '@/components/form-status'
import { ErrorState, LoadingState } from '@/components/state-views'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useFetch } from '@/hooks/use-fetch'
import { useSave } from '@/hooks/use-save'
import { api } from '@/lib/api'
import { formatPrice, hasMaxTwoDecimals, moneyToInput, parseMoney } from '@/lib/format'
import type { TaxasEntrega, TempoPreparo, Valores } from '@/types/types'

function checkMoney(text: string, allowZero: boolean): string | null {
  const n = parseMoney(text)
  if (n === null) return 'Informe um valor.'
  if (n < 0 || (!allowZero && n === 0)) return allowZero ? 'Não pode ser negativo.' : 'Deve ser maior que zero.'
  if (!hasMaxTwoDecimals(n)) return 'Use no máximo 2 casas decimais.'
  return null
}

function MoneyField({
  id,
  label,
  value,
  onChange,
  error,
  hint,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  error?: string | null
  hint?: string
}) {
  return (
    <div className="price-grid__item field">
      <Label htmlFor={id}>{label}</Label>
      <div className="input-prefix">
        <span className="input-prefix__symbol">R$</span>
        <Input id={id} inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} />
      </div>
      {error ? <p className="field__error">{error}</p> : hint && <p className="field__hint">{hint}</p>}
    </div>
  )
}

function ValoresForm({ valores, onSaved }: { valores: Valores; onSaved: (v: Valores) => void }) {
  const [faixas, setFaixas] = useState(() => Object.fromEntries(valores.faixas.map((f) => [f.quantidade, moneyToInput(f.valor)])))
  const [acima, setAcima] = useState(moneyToInput(valores.acimaDe.valorPorUnidade))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const save = useSave()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const next: Record<string, string> = {}
    for (const f of valores.faixas) {
      const err = checkMoney(faixas[f.quantidade] ?? '', false)
      if (err) next[`f${f.quantidade}`] = err
    }
    const errAcima = checkMoney(acima, false)
    if (errAcima) next.acima = errAcima
    setErrors(next)
    if (Object.keys(next).length) return save.fail('Corrija os campos destacados.')

    await save.run(async () => {
      const salvo = await api.salvarValores({
        faixas: valores.faixas.map((f) => ({ quantidade: f.quantidade, valor: parseMoney(faixas[f.quantidade])! })),
        valorUnidadeAcimaDe100: parseMoney(acima)!,
      })
      onSaved(salvo)
    })
  }

  return (
    <form onSubmit={submit} className="section" noValidate>
      <h3 className="section__title">Tabela de preços</h3>
      <p className="section__hint">Valor total do pedido para cada quantidade. Acima de {valores.acimaDe.quantidade} unidades, cobra-se por unidade.</p>
      <div className="price-grid">
        {valores.faixas.map((f) => (
          <MoneyField
            key={f.quantidade}
            id={`faixa-${f.quantidade}`}
            label={`${f.quantidade} unidades`}
            value={faixas[f.quantidade] ?? ''}
            onChange={(v) => { setFaixas((p) => ({ ...p, [f.quantidade]: v })); save.reset() }}
            error={errors[`f${f.quantidade}`]}
          />
        ))}
        <MoneyField
          id="acima"
          label={`Acima de ${valores.acimaDe.quantidade} un. (por unidade)`}
          value={acima}
          onChange={(v) => { setAcima(v); save.reset() }}
          error={errors.acima}
        />
      </div>
      <div className="form-actions">
        <Button type="submit" disabled={save.saving}>{save.saving ? 'Salvando...' : 'Salvar preços'}</Button>
        <FormStatus error={save.error} saved={save.saved} />
      </div>
    </form>
  )
}

function TaxasForm({ taxas, onSaved }: { taxas: TaxasEntrega; onSaved: (t: TaxasEntrega) => void }) {
  const [ate49, setAte49] = useState(moneyToInput(taxas.taxaAte49))
  const [de50, setDe50] = useState(moneyToInput(taxas.taxaDe50a199))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const save = useSave()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const next: Record<string, string> = {}
    const e1 = checkMoney(ate49, true)
    const e2 = checkMoney(de50, true)
    if (e1) next.ate49 = e1
    if (e2) next.de50 = e2
    setErrors(next)
    if (Object.keys(next).length) return save.fail('Corrija os campos destacados.')

    await save.run(async () => onSaved(await api.salvarTaxas({ taxaAte49: parseMoney(ate49)!, taxaDe50a199: parseMoney(de50)! })))
  }

  return (
    <form onSubmit={submit} className="section" noValidate>
      <h3 className="section__title">Taxa de entrega</h3>
      <p className="section__hint">
        Entrega grátis a partir de {taxas.entregaGratisAPartirDe} unidades (valor fixo na API). A retirada nunca tem taxa.
      </p>
      <div className="field-pair">
        <MoneyField id="taxa-49" label="Até 49 unidades" value={ate49} onChange={(v) => { setAte49(v); save.reset() }} error={errors.ate49} />
        <MoneyField id="taxa-50" label={`De 50 a ${taxas.entregaGratisAPartirDe - 1} unidades`} value={de50} onChange={(v) => { setDe50(v); save.reset() }} error={errors.de50} />
      </div>
      <div className="form-actions">
        <Button type="submit" disabled={save.saving}>{save.saving ? 'Salvando...' : 'Salvar taxas'}</Button>
        <FormStatus error={save.error} saved={save.saved} />
      </div>
    </form>
  )
}

function TempoForm({ tempo, onSaved }: { tempo: TempoPreparo; onSaved: (t: TempoPreparo) => void }) {
  const [min, setMin] = useState(String(tempo.minimoMin))
  const [max, setMax] = useState(String(tempo.maximoMin))
  const save = useSave()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const a = Number(min)
    const b = Number(max)
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b < 1 || a > 1440 || b > 1440) {
      return save.fail('Use números inteiros de 1 a 1440 minutos.')
    }
    if (b < a) return save.fail('O tempo máximo não pode ser menor que o mínimo.')
    await save.run(async () => onSaved(await api.salvarTempoPreparo({ minimoMin: a, maximoMin: b })))
  }

  return (
    <form onSubmit={submit} className="section" noValidate>
      <h3 className="section__title">Tempo de preparo</h3>
      <p className="section__hint">Mostrado ao cliente como "Preparo em X a Y min".</p>
      <div className="field-pair">
        <div className="field">
          <Label htmlFor="tempo-min">Mínimo (minutos)</Label>
          <Input id="tempo-min" inputMode="numeric" value={min} onChange={(e) => { setMin(e.target.value.replace(/\D/g, '')); save.reset() }} />
        </div>
        <div className="field">
          <Label htmlFor="tempo-max">Máximo (minutos)</Label>
          <Input id="tempo-max" inputMode="numeric" value={max} onChange={(e) => { setMax(e.target.value.replace(/\D/g, '')); save.reset() }} />
        </div>
      </div>
      <div className="form-actions">
        <Button type="submit" disabled={save.saving}>{save.saving ? 'Salvando...' : 'Salvar tempo'}</Button>
        <FormStatus error={save.error} saved={save.saved} />
      </div>
    </form>
  )
}

export default function PricingPage() {
  const dados = useFetch(async () => {
    const [valores, taxas, tempo] = await Promise.all([api.valores(), api.taxas(), api.tempoPreparo()])
    return { valores, taxas, tempo }
  }, [])

  return (
    <div className="admin-content max-w-4xl">
      <div className="page-head">
        <div>
          <h2 className="page-head__title">Preços e entrega</h2>
          <p className="page-head__text">
            Novos valores valem para pedidos feitos a partir de agora. Pedidos já criados mantêm o preço da época.
          </p>
        </div>
      </div>

      {dados.loading && !dados.data ? (
        <LoadingState label="Carregando preços..." />
      ) : !dados.data ? (
        <ErrorState error={dados.error} onRetry={dados.reload} title="Não conseguimos carregar os preços" />
      ) : (
        <>
          <p className="alert alert--info">
            Exemplo: 50 unidades com entrega = {formatPrice(parseFloat(dados.data.valores.faixas.find((f) => f.quantidade === 50)?.valor ?? '0') + parseFloat(dados.data.taxas.taxaDe50a199))}.
          </p>
          <ValoresForm valores={dados.data.valores} onSaved={(valores) => dados.mutate((d) => ({ ...d, valores }))} />
          <TaxasForm taxas={dados.data.taxas} onSaved={(taxas) => dados.mutate((d) => ({ ...d, taxas }))} />
          <TempoForm tempo={dados.data.tempo} onSaved={(tempo) => dados.mutate((d) => ({ ...d, tempo }))} />
        </>
      )}
    </div>
  )
}
