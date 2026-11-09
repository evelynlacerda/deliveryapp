import { useState } from 'react'
import { FormStatus } from '@/components/form-status'
import { ErrorState, LoadingState } from '@/components/state-views'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useFetch } from '@/hooks/use-fetch'
import { useSave } from '@/hooks/use-save'
import { api } from '@/lib/api'
import { NOMES_DOS_DIAS, textoHorario } from '@/lib/funcionamento'
import type { Funcionamento, SalvarFuncionamentoBody } from '@/types/types'

function Switch({ id, checked, disabled, onChange }: { id: string; checked: boolean; disabled?: boolean; onChange: (valor: boolean) => void }) {
  return (
    <button id={id} type="button" role="switch" aria-checked={checked} disabled={disabled} className="switch" onClick={() => onChange(!checked)}>
      <span className="switch__thumb" />
    </button>
  )
}

function situacaoTexto(f: Funcionamento) {
  if (f.motivoFechado === 'FECHADO_MANUAL') return 'Fechado (você marcou "Estabelecimento fechado")'
  if (f.motivoFechado === 'FORA_DO_HORARIO') return 'Fechado (fora dos dias e do horário de atendimento)'
  return 'Aberto'
}

function corpoDe(salvo: Funcionamento, mudanca: Partial<SalvarFuncionamentoBody>): SalvarFuncionamentoBody {
  return {
    horarioAbertura: salvo.horarioAbertura,
    horarioFechamento: salvo.horarioFechamento,
    estabelecimentoFechado: salvo.estabelecimentoFechado,
    entregaHoje: salvo.entregaHoje,
    diasAtendimento: salvo.diasAtendimento,
    ...mudanca,
  }
}

function Chaves({ salvo, onSaved }: { salvo: Funcionamento; onSaved: (f: Funcionamento) => void }) {
  const save = useSave()

  const alterar = (mudanca: Partial<SalvarFuncionamentoBody>) =>
    save.run(async () => onSaved(await api.salvarFuncionamento(corpoDe(salvo, mudanca))))

  return (
    <section className="section">
      <h3 className="section__title">Chaves do dia a dia</h3>
      <p className="section__hint">Valem na hora, sem precisar salvar.</p>

      <div className="switch-row">
        <div>
          <Label htmlFor="fechado">Estabelecimento fechado</Label>
          <p className="field__hint">
            Ligado, ninguém consegue fazer pedido, nem agendado, mesmo dentro do horário de atendimento. Fica assim até você desligar.
          </p>
        </div>
        <Switch id="fechado" checked={salvo.estabelecimentoFechado} disabled={save.saving} onChange={(v) => alterar({ estabelecimentoFechado: v })} />
      </div>

      <div className="switch-row">
        <div>
          <Label htmlFor="entrega-hoje">Entrega hoje</Label>
          <p className="field__hint">
            Desligado, hoje só tem retirada. O cliente ainda pode agendar entrega para outro dia. Volta a ligar sozinha amanhã.
          </p>
        </div>
        <Switch id="entrega-hoje" checked={salvo.entregaHoje} disabled={save.saving} onChange={(v) => alterar({ entregaHoje: v })} />
      </div>

      <FormStatus error={save.error} saved={save.saved} />
    </section>
  )
}

function Horario({ salvo, onSaved }: { salvo: Funcionamento; onSaved: (f: Funcionamento) => void }) {
  const [abertura, setAbertura] = useState(salvo.horarioAbertura ?? '')
  const [fechamento, setFechamento] = useState(salvo.horarioFechamento ?? '')
  const [dias, setDias] = useState<number[]>(salvo.diasAtendimento)
  const [erro, setErro] = useState('')
  const save = useSave()

  const mudou = () => {
    save.reset()
    setErro('')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if ((abertura === '') !== (fechamento === '')) return setErro('Informe a abertura e o fechamento, ou deixe os dois vazios.')
    if (abertura !== '' && abertura === fechamento) return setErro('O fechamento deve ser diferente da abertura.')
    if (dias.length === 0) return setErro('Selecione ao menos um dia de atendimento. Para fechar tudo, use "Estabelecimento fechado".')
    setErro('')

    await save.run(async () =>
      onSaved(
        await api.salvarFuncionamento(
          corpoDe(salvo, { horarioAbertura: abertura || null, horarioFechamento: fechamento || null, diasAtendimento: dias }),
        ),
      ),
    )
  }

  return (
    <form onSubmit={submit} className="section" noValidate>
      <h3 className="section__title">Dias e horário de atendimento</h3>
      <p className="section__hint">
        Marque os dias em que você atende. Nos dias desmarcados o estabelecimento fica fechado automaticamente (o cliente só consegue
        agendar para um dia marcado). Os horários valem para os dias marcados, no horário de Brasília. Deixe os dois campos vazios para
        atender o dia todo. Se o fechamento for menor que a abertura (ex.: 18:00 às 02:00), o atendimento passa da meia-noite.
      </p>
      <fieldset className="mb-4">
        <legend className="mb-2 text-sm font-medium">Dias de atendimento</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {NOMES_DOS_DIAS.map((nome, dia) => (
            <label key={dia} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-current"
                checked={dias.includes(dia)}
                onChange={(e) => {
                  setDias((atual) => (e.target.checked ? [...atual, dia].sort((a, b) => a - b) : atual.filter((d) => d !== dia)))
                  mudou()
                }}
              />
              {nome}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="field-pair">
        <div className="field">
          <Label htmlFor="abertura">Abre às</Label>
          <Input id="abertura" type="time" value={abertura} onChange={(e) => { setAbertura(e.target.value); mudou() }} aria-invalid={!!erro} />
        </div>
        <div className="field">
          <Label htmlFor="fechamento">Fecha às</Label>
          <Input id="fechamento" type="time" value={fechamento} onChange={(e) => { setFechamento(e.target.value); mudou() }} aria-invalid={!!erro} />
        </div>
      </div>
      {erro && <p className="field__error mt-2">{erro}</p>}
      <div className="form-actions">
        <Button type="submit" disabled={save.saving}>{save.saving ? 'Salvando...' : 'Salvar dias e horário'}</Button>
        {(abertura !== '' || fechamento !== '') && (
          <Button type="button" variant="ghost" onClick={() => { setAbertura(''); setFechamento(''); mudou() }}>
            Sem horário definido
          </Button>
        )}
        <FormStatus error={save.error} saved={save.saved} />
      </div>
    </form>
  )
}

function EnderecoRetirada({ salvo, onSaved }: { salvo: Funcionamento; onSaved: (f: Funcionamento) => void }) {
  const [endereco, setEndereco] = useState(salvo.enderecoRetirada ?? '')
  const save = useSave()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    await save.run(async () => onSaved(await api.salvarEnderecoRetirada(endereco.trim())))
  }

  return (
    <form onSubmit={submit} className="section" noValidate>
      <h3 className="section__title">Endereço para retirada</h3>
      <p className="section__hint">
        Aparece para o cliente que escolhe retirada, na página de pedido e nos dados do pedido. Deixe vazio para não mostrar.
      </p>
      <div className="field">
        <Label htmlFor="endereco-retirada">Endereço</Label>
        <Input
          id="endereco-retirada"
          value={endereco}
          maxLength={300}
          placeholder="Rua, número, bairro e ponto de referência"
          onChange={(e) => { setEndereco(e.target.value); save.reset() }}
        />
      </div>
      <div className="form-actions">
        <Button type="submit" disabled={save.saving}>{save.saving ? 'Salvando...' : 'Salvar endereço'}</Button>
        <FormStatus error={save.error} saved={save.saved} />
      </div>
    </form>
  )
}

export default function FuncionamentoPage() {
  const funcionamento = useFetch(api.funcionamento, [], 60_000)
  const dados = funcionamento.data

  return (
    <div className="admin-content max-w-2xl">
      <div className="page-head">
        <div>
          <h2 className="page-head__title">Funcionamento</h2>
          <p className="page-head__text">Dias e horário de atendimento, endereço de retirada, fechamento do estabelecimento e entrega do dia.</p>
        </div>
      </div>

      {funcionamento.loading && !dados ? (
        <LoadingState label="Carregando funcionamento..." />
      ) : !dados ? (
        <ErrorState error={funcionamento.error} onRetry={funcionamento.reload} title="Não conseguimos carregar o funcionamento" />
      ) : (
        <>
          <div className="funcionamento-status" data-aberto={dados.aberto}>
            <p className="funcionamento-status__label">Agora</p>
            <p className="funcionamento-status__valor">{situacaoTexto(dados)}</p>
            <p className="funcionamento-status__detalhe">
              {textoHorario(dados) ? `Atendimento ${textoHorario(dados)}.` : 'Atendimento todos os dias, sem horário definido.'}{' '}
              {dados.entregaHoje ? 'Entrega ligada hoje.' : 'Hoje só retirada.'}
            </p>
          </div>
          <Chaves salvo={dados} onSaved={(f) => funcionamento.mutate(() => f)} />
          <Horario key={`${dados.diasAtendimento.join()}-${dados.horarioAbertura}-${dados.horarioFechamento}`} salvo={dados} onSaved={(f) => funcionamento.mutate(() => f)} />
          <EnderecoRetirada salvo={dados} onSaved={(f) => funcionamento.mutate(() => f)} />
        </>
      )}
    </div>
  )
}
