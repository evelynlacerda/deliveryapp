import { useState } from 'react'
import { Lock } from 'lucide-react'
import { FormStatus } from '@/components/form-status'
import { ErrorState, LoadingState } from '@/components/state-views'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useFetch } from '@/hooks/use-fetch'
import { useSave } from '@/hooks/use-save'
import { api } from '@/lib/api'
import { formatPhone, tipoPixLabels } from '@/lib/format'
import type { Pix, TipoChavePix } from '@/types/types'

const placeholders: Record<TipoChavePix, string> = {
  CPF: '000.000.000-00',
  CNPJ: '00.000.000/0000-00',
  TELEFONE: '(11) 91234-5678',
  ALEATORIA: '123e4567-e89b-12d3-a456-426614174000',
}

function PixForm({ pix, onSaved }: { pix: Pix; onSaved: (p: Pix) => void }) {
  const [whatsapp, setWhatsapp] = useState(pix.whatsapp ? formatPhone(pix.whatsapp) : '')
  const [tipo, setTipo] = useState<TipoChavePix>(pix.tipo)
  const [chave, setChave] = useState(pix.configurada ? pix.chave : '')
  const [titular, setTitular] = useState(pix.titular ?? '')
  const [banco, setBanco] = useState(pix.banco ?? '')
  const [horasAte, setHorasAte] = useState(String(pix.antecedencia.ateLimiteHoras))
  const [horasAcima, setHorasAcima] = useState(String(pix.antecedencia.acimaLimiteHoras))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const save = useSave()
  const limite = pix.antecedencia.limiteUnidades

  const touch = () => save.reset()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const next: Record<string, string> = {}
    const zap = whatsapp.replace(/\D/g, '')
    if (zap && !/^\d{10,11}$/.test(zap)) next.whatsapp = 'Informe o WhatsApp com DDD.'
    if (!pix.bloqueada && chave.trim() === '') next.chave = 'Informe a chave Pix.'
    const a = Number(horasAte)
    const b = Number(horasAcima)
    if (horasAte === '' || !Number.isInteger(a) || a < 0 || a > 168) next.horasAte = 'Use de 0 a 168 horas.'
    if (horasAcima === '' || !Number.isInteger(b) || b < 0 || b > 168) next.horasAcima = 'Use de 0 a 168 horas.'
    setErrors(next)
    if (Object.keys(next).length) return save.fail('Corrija os campos destacados.')

    await save.run(async () =>
      onSaved(
        await api.salvarPix({
          tipo: pix.bloqueada ? pix.tipo : tipo,
          chave: pix.bloqueada ? pix.chave : chave.trim(),
          titular: titular.trim(),
          banco: banco.trim(),
          whatsapp: zap,
          antecedenciaAteLimiteHoras: a,
          antecedenciaAcimaLimiteHoras: b,
        }),
      ),
    )
  }

  return (
    <form onSubmit={submit} className="stack" noValidate>
      <section className="section">
        <h3 className="section__title">Contato do estabelecimento</h3>
        <p className="section__hint">O cliente envia o comprovante do Pix para este WhatsApp.</p>
        <div className="field">
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <Input id="whatsapp" type="tel" inputMode="tel" value={whatsapp} onChange={(e) => { setWhatsapp(formatPhone(e.target.value)); touch() }} placeholder="(11) 91234-5678" disabled={pix.bloqueada} aria-invalid={!!errors.whatsapp} />
          {errors.whatsapp ? <p className="field__error">{errors.whatsapp}</p> : pix.bloqueada ? <p className="field__hint">Número fictício e fixo nesta demonstração.</p> : <p className="field__hint">Sem o número, o botão de WhatsApp não aparece para o cliente.</p>}
        </div>
      </section>

      <section className="section">
        <h3 className="section__title mb-3">Chave Pix</h3>
        {pix.bloqueada && (
          <p role="note" className="alert alert--info mb-3 flex items-start gap-2">
            <Lock className="mt-0.5 size-4 shrink-0" />
            <span>
              <strong>Chave Pix, favorecido, banco e WhatsApp estão inalterados por segurança.</strong> Esta é uma versão de demonstração
              aberta ao público: esses dados são fictícios e ficam travados para que ninguém cadastre os próprios por engano (ou de
              propósito). Só o prazo do pagamento pode ser editado.
            </span>
          </p>
        )}
        <div className="stack">
          <fieldset className="field">
            <legend className="mb-1.5 text-sm font-medium">Tipo da chave</legend>
            <div className="chip-row">
              {(Object.keys(tipoPixLabels) as TipoChavePix[]).map((t) => (
                <button key={t} type="button" className="chip" aria-pressed={tipo === t} disabled={pix.bloqueada} onClick={() => { setTipo(t); touch() }}>
                  {tipoPixLabels[t]}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="field">
            <Label htmlFor="chave-pix">Chave</Label>
            <Input id="chave-pix" value={chave} onChange={(e) => { setChave(e.target.value); touch() }} placeholder={placeholders[tipo]} autoComplete="off" disabled={pix.bloqueada} aria-invalid={!!errors.chave} />
            {errors.chave ? <p className="field__error">{errors.chave}</p> : pix.bloqueada ? <p className="field__hint">Chave fixa nesta demonstração.</p> : <p className="field__hint">CPF e CNPJ são conferidos pelos dígitos verificadores. Telefone precisa de DDD.</p>}
          </div>
          <div className="field-pair">
            <div className="field">
              <Label htmlFor="titular">Nome do favorecido</Label>
              <Input id="titular" value={titular} onChange={(e) => { setTitular(e.target.value); touch() }} maxLength={80} placeholder="Quem recebe o Pix" disabled={pix.bloqueada} />
            </div>
            <div className="field">
              <Label htmlFor="banco">Banco</Label>
              <Input id="banco" value={banco} onChange={(e) => { setBanco(e.target.value); touch() }} maxLength={80} placeholder="Ex.: Nubank" disabled={pix.bloqueada} />
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <h3 className="section__title">Prazo do pagamento</h3>
        <p className="section__hint">
          Pedido para hoje ou "assim que ficar pronto": o cliente paga no ato do pedido. Pedido agendado para um dia seguinte: o Pix
          deve ser pago com esta antecedência em relação ao horário escolhido.
        </p>
        <div className="field-pair">
          <div className="field">
            <Label htmlFor="horas-ate">Até {limite} unidades (horas antes)</Label>
            <Input id="horas-ate" inputMode="numeric" value={horasAte} onChange={(e) => { setHorasAte(e.target.value.replace(/\D/g, '')); touch() }} aria-invalid={!!errors.horasAte} />
            {errors.horasAte && <p className="field__error">{errors.horasAte}</p>}
          </div>
          <div className="field">
            <Label htmlFor="horas-acima">Acima de {limite} unidades (horas antes)</Label>
            <Input id="horas-acima" inputMode="numeric" value={horasAcima} onChange={(e) => { setHorasAcima(e.target.value.replace(/\D/g, '')); touch() }} aria-invalid={!!errors.horasAcima} />
            {errors.horasAcima && <p className="field__error">{errors.horasAcima}</p>}
          </div>
        </div>
      </section>

      <div className="form-actions mt-0">
        <Button type="submit" disabled={save.saving}>{save.saving ? 'Salvando...' : 'Salvar'}</Button>
        <FormStatus error={save.error} saved={save.saved} />
      </div>
    </form>
  )
}

export default function PixPage() {
  const pix = useFetch(api.pix, [])

  return (
    <div className="admin-content max-w-2xl">
      <div className="page-head">
        <div>
          <h2 className="page-head__title">Pix e contato</h2>
          <p className="page-head__text">
            O cliente copia a chave, paga pelo banco e envia o comprovante pelo seu WhatsApp. Quando você confirmar, mude o pedido para
            "Pagamento aprovado". O sistema não confirma pagamentos sozinho.
          </p>
        </div>
      </div>

      {pix.loading && !pix.data ? (
        <LoadingState label="Carregando dados do Pix..." />
      ) : !pix.data ? (
        <ErrorState error={pix.error} onRetry={pix.reload} title="Não conseguimos carregar o Pix" />
      ) : (
        <>
          {pix.data.configurada ? (
            <div className="pix-box">
              <p className="text-sm">Como o cliente vê (ao copiar):</p>
              <p className="pix-box__key">{pix.data.chaveParaCopiar}</p>
              {(pix.data.titular || pix.data.banco) && (
                <p className="text-sm text-muted-foreground">{[pix.data.titular, pix.data.banco].filter(Boolean).join(' · ')}</p>
              )}
            </div>
          ) : (
            <p className="alert alert--info">
              Nenhuma chave cadastrada. Enquanto isso, a opção de pagar com Pix fica escondida para os clientes.
            </p>
          )}
          <PixForm pix={pix.data} onSaved={(p) => pix.mutate(() => p)} />
        </>
      )}
    </div>
  )
}
