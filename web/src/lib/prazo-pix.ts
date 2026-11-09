import type { InstrucaoPix, Pix } from '@/types/types'

const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })

export function previaPrazoPix(
  horario: Date | null,
  quantidade: number,
  antecedencia: Pix['antecedencia'],
  agora = new Date(),
): InstrucaoPix {
  const imediato: InstrucaoPix = { imediato: true, horasAntecedencia: null, pagarAte: null }
  if (!horario || dia.format(horario) === dia.format(agora)) return imediato

  const horas = quantidade <= antecedencia.limiteUnidades ? antecedencia.ateLimiteHoras : antecedencia.acimaLimiteHoras
  const pagarAte = new Date(horario.getTime() - horas * 3_600_000)
  if (pagarAte.getTime() <= agora.getTime()) return imediato

  return { imediato: false, horasAntecedencia: horas, pagarAte: pagarAte.toISOString() }
}

export const MENSAGEM_PIX_IMEDIATO = 'O pedido só será iniciado depois que você pagar, enviar o comprovante por WhatsApp e o pagamento for confirmado por nós.'

export function textoPrazoPix(i: InstrucaoPix, formatar: (iso: string) => string) {
  if (i.imediato || !i.pagarAte) return MENSAGEM_PIX_IMEDIATO
  return `Pague com pelo menos ${i.horasAntecedencia} horas de antecedência do horário escolhido, ou seja, até ${formatar(i.pagarAte)}, e envie o comprovante por WhatsApp. O pedido só será iniciado depois que o pagamento for confirmado por nós.`
}
