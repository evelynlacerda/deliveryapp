import { describe, expect, it } from 'vitest'
import { dentroDoHorario, diaEmBrasilia, erroDeAgendamento, formatarHora, minutosEmBrasilia, textoDias, textoHorario } from '@/lib/funcionamento'
import type { Funcionamento } from '@/types/types'

const base: Funcionamento = {
  horarioAbertura: '08:00',
  horarioFechamento: '18:00',
  diasAtendimento: [0, 1, 2, 3, 4, 5, 6],
  enderecoRetirada: null,
  estabelecimentoFechado: false,
  aberto: true,
  motivoFechado: null,
  entregaHoje: true,
}

const em = (iso: string) => new Date(`${iso}-03:00`)

describe('funcionamento (cliente)', () => {
  it('lê hora e dia no horário de Brasília, não no do navegador', () => {
    expect(minutosEmBrasilia(new Date('2026-11-03T15:30:00Z'))).toBe(12 * 60 + 30)
    expect(diaEmBrasilia(new Date('2026-11-04T01:00:00Z'))).toBe('2026-11-03')
  })

  it('abertura inclusiva e fechamento exclusivo', () => {
    expect(dentroDoHorario(base, em('2026-11-03T07:59:00'))).toBe(false)
    expect(dentroDoHorario(base, em('2026-11-03T08:00:00'))).toBe(true)
    expect(dentroDoHorario(base, em('2026-11-03T18:00:00'))).toBe(false)
  })

  it('sem horário definido nunca restringe; atendimento pode passar da meia-noite', () => {
    expect(dentroDoHorario({ horarioAbertura: null, horarioFechamento: null }, em('2026-11-03T03:00:00'))).toBe(true)
    const noite = { horarioAbertura: '18:00', horarioFechamento: '02:00' }
    expect(dentroDoHorario(noite, em('2026-11-03T23:00:00'))).toBe(true)
    expect(dentroDoHorario(noite, em('2026-11-03T12:00:00'))).toBe(false)
  })

  it('formata o horário para o cliente', () => {
    expect(formatarHora('08:00')).toBe('8h')
    expect(formatarHora('18:30')).toBe('18h30')
    expect(textoHorario(base)).toBe('das 8h às 18h')
    expect(textoHorario({ horarioAbertura: null, horarioFechamento: null })).toBeNull()
  })

  it('avisa quando o horário agendado está fora do atendimento', () => {
    const agora = em('2026-11-03T12:00:00')
    expect(erroDeAgendamento(base, 'RETIRADA', em('2026-11-04T19:00:00'), agora)).toMatch(/dentro do atendimento \(das 8h às 18h\)/)
    expect(erroDeAgendamento(base, 'RETIRADA', em('2026-11-04T10:00:00'), agora)).toBeUndefined()
  })

  it('sem entrega hoje: recusa entrega agendada para hoje, aceita outro dia e retirada', () => {
    const semEntrega = { ...base, entregaHoje: false }
    const agora = em('2026-11-03T12:00:00')
    expect(erroDeAgendamento(semEntrega, 'ENTREGA', em('2026-11-03T16:00:00'), agora)).toMatch(/Hoje não estamos fazendo entregas/)
    expect(erroDeAgendamento(semEntrega, 'ENTREGA', em('2026-11-04T10:00:00'), agora)).toBeUndefined()
    expect(erroDeAgendamento(semEntrega, 'RETIRADA', em('2026-11-03T16:00:00'), agora)).toBeUndefined()
  })
})

describe('dias de atendimento (cliente)', () => {
  const segASex = { ...base, diasAtendimento: [1, 2, 3, 4, 5] }

  it('dia desmarcado fecha o dia todo', () => {
    expect(dentroDoHorario(segASex, em('2026-11-03T12:00:00'))).toBe(true)
    expect(dentroDoHorario(segASex, em('2026-11-07T12:00:00'))).toBe(false)
  })

  it('madrugada de um atendimento noturno pertence ao dia em que começou', () => {
    const noite = { horarioAbertura: '18:00', horarioFechamento: '02:00', diasAtendimento: [5] }
    expect(dentroDoHorario(noite, em('2026-11-07T01:00:00'))).toBe(true)
    expect(dentroDoHorario(noite, em('2026-11-06T01:00:00'))).toBe(false)
  })

  it('texto dos dias e do atendimento', () => {
    expect(textoDias([0, 1, 2, 3, 4, 5, 6])).toBeNull()
    expect(textoDias([1, 2, 3, 4, 5])).toBe('seg a sex')
    expect(textoDias([1, 3, 5])).toBe('seg, qua e sex')
    expect(textoHorario(segASex)).toBe('das 8h às 18h, seg a sex')
    expect(textoHorario({ horarioAbertura: null, horarioFechamento: null, diasAtendimento: [1, 2, 3, 4, 5] })).toBe('seg a sex')
  })
})
