import { describe, expect, it } from 'vitest'
import { formatPhone, telefoneColado, intervaloDoPeriodo, formatQtdItem, hasMaxTwoDecimals, nextStatus, parseMoney, statusFlow, temItemADividir, textoEndereco, normalizarTelefone, telefoneValido } from '@/lib/format'
import { whatsappLink } from '@/lib/whatsapp'

describe('statusFlow e nextStatus', () => {
  it('Pix passa por aguardando pagamento e pagamento aprovado', () => {
    const pedido = { tipoEntrega: 'ENTREGA', formaPagamento: 'PIX', status: 'AGUARDANDO_PAGAMENTO' } as const

    expect(statusFlow(pedido)).toEqual(['AGUARDANDO_PAGAMENTO', 'PAGAMENTO_APROVADO', 'EM_PRODUCAO', 'EM_ROTA_ENTREGA', 'FINALIZADO'])
    expect(nextStatus(pedido)).toBe('PAGAMENTO_APROVADO')
  })

  it('dinheiro e cartão seguem direto; retirada usa "pronto para retirada"', () => {
    const pedido = { tipoEntrega: 'RETIRADA', formaPagamento: 'DINHEIRO', status: 'EM_PRODUCAO' } as const

    expect(statusFlow(pedido)).toEqual(['AGUARDANDO', 'EM_PRODUCAO', 'PRONTO_RETIRADA', 'FINALIZADO'])
    expect(nextStatus(pedido)).toBe('PRONTO_RETIRADA')
  })

  it('o último status não tem próximo e pedidos antigos mantêm o status atual no fluxo', () => {
    expect(nextStatus({ tipoEntrega: 'ENTREGA', formaPagamento: 'DINHEIRO', status: 'FINALIZADO' })).toBeNull()

    const antigo = { tipoEntrega: 'ENTREGA', formaPagamento: 'PIX', status: 'AGUARDANDO' } as const
    expect(statusFlow(antigo)[0]).toBe('AGUARDANDO')
    expect(nextStatus(antigo)).toBe('AGUARDANDO_PAGAMENTO')
  })
})

describe('valores digitados', () => {
  it('parseMoney aceita vírgula ou ponto e rejeita texto', () => {
    expect(parseMoney('13,50')).toBe(13.5)
    expect(parseMoney(' 7.25 ')).toBe(7.25)
    expect(parseMoney('')).toBeNull()
    expect(parseMoney('abc')).toBeNull()
    expect(hasMaxTwoDecimals(7.25)).toBe(true)
    expect(hasMaxTwoDecimals(7.123)).toBe(false)
  })

  it('formatPhone aplica a máscara de celular e de fixo', () => {
    expect(formatPhone('11912345678')).toBe('(11) 91234-5678')
    expect(formatPhone('1134567890')).toBe('(11) 3456-7890')
    expect(formatPhone('(11) 9')).toBe('(11) 9')
  })
})

describe('whatsappLink', () => {
  it('acrescenta o 55 quando falta o DDI e codifica a mensagem', () => {
    expect(whatsappLink('(11) 91234-5678')).toBe('https://wa.me/5511912345678')
    expect(whatsappLink('5511912345678', 'Olá, pedido AB2C')).toBe('https://wa.me/5511912345678?text=Ol%C3%A1%2C%20pedido%20AB2C')
  })
})

describe("itens do pedido", () => {
  it("mostra a quantidade ou 'a dividir' quando o cliente só escolheu o sabor", () => {
    expect(formatQtdItem(20)).toBe('20 un.');
    expect(formatQtdItem(null)).toBe('a dividir');
    expect(temItemADividir([{ quantidade: null }, { quantidade: null }])).toBe(true);
    expect(temItemADividir([{ quantidade: 30 }, { quantidade: 20 }])).toBe(false);
  });
});

describe('intervaloDoPeriodo (filtros do painel)', () => {
  it('dia e todos', () => {
    expect(intervaloDoPeriodo('dia', '2026-11-03')).toEqual({ de: '2026-11-03', ate: '2026-11-03' })
    expect(intervaloDoPeriodo('todos', '2026-11-03')).toEqual({})
  })

  it('semana vai de segunda a domingo', () => {
    expect(intervaloDoPeriodo('semana', '2026-11-03')).toEqual({ de: '2026-11-02', ate: '2026-11-08' })
    expect(intervaloDoPeriodo('semana', '2026-11-08')).toEqual({ de: '2026-11-02', ate: '2026-11-08' })
    expect(intervaloDoPeriodo('semana', '2026-11-02')).toEqual({ de: '2026-11-02', ate: '2026-11-08' })
  })

  it('semana atravessa o fim do mês e do ano', () => {
    expect(intervaloDoPeriodo('semana', '2026-12-31')).toEqual({ de: '2026-12-28', ate: '2027-01-03' })
  })

  it('mês inteiro, inclusive fevereiro de ano bissexto', () => {
    expect(intervaloDoPeriodo('mes', '2026-11-15')).toEqual({ de: '2026-11-01', ate: '2026-11-30' })
    expect(intervaloDoPeriodo('mes', '2028-02-10')).toEqual({ de: '2028-02-01', ate: '2028-02-29' })
  })
})

describe('textoEndereco', () => {
  it('junta rua, número e bairro', () => {
    expect(textoEndereco({ endereco: 'Rua das Flores', numero: '123', bairro: 'Centro' })).toBe('Rua das Flores, 123 - Centro')
  })

  it('pedidos antigos (sem número e bairro) mostram só o endereço', () => {
    expect(textoEndereco({ endereco: 'Rua das Flores, 123 - Centro', numero: null, bairro: null })).toBe('Rua das Flores, 123 - Centro')
  })
})

describe('telefone', () => {
  it('remove o DDI 55 só quando o número veio completo', () => {
    expect(normalizarTelefone('+55 (44) 99123-4567')).toBe('44991234567')
    expect(normalizarTelefone('5544991234567')).toBe('44991234567')
    expect(normalizarTelefone('(55) 99123-4567')).toBe('55991234567') // DDD 55 de verdade
  })

  it('remove o +55 colado, com ou sem máscara, e mesmo antes de o número estar completo', () => {
    expect(normalizarTelefone('+55 44 91234-5678')).toBe('44912345678')
    expect(normalizarTelefone('+5544912345678')).toBe('44912345678')
    expect(normalizarTelefone('  +55 (44) 91234-5678')).toBe('44912345678')
    expect(normalizarTelefone('+55')).toBe('')
  })

  it('mantém o DDD 55 (RS) enquanto digita, mesmo com dígitos a mais', () => {
    expect(normalizarTelefone('55912345678')).toBe('55912345678')
    expect(normalizarTelefone('559123456789')).toBe('559123456789') // o campo corta em 11 depois
    expect(formatPhone('559123456789')).toBe('(55) 91234-5678')
  })

  it('telefoneColado tira o +55/55 e acrescenta o 9 que faltou depois do DDD', () => {
    expect(telefoneColado('+55 44 91234-5678')).toBe('44912345678')
    expect(telefoneColado('+55 44 1234-5678')).toBe('44912345678') // sem o 9
    expect(telefoneColado('554412345678')).toBe('44912345678') // 55 sem "+", sem o 9
    expect(telefoneColado('4412345678')).toBe('44912345678')
    expect(telefoneColado('55912345678')).toBe('55912345678') // DDD 55 de verdade
    expect(telefoneColado('+55 55 91234-5678')).toBe('55912345678')
    expect(telefoneColado('(44) 3123-4567')).toBe('4431234567') // fixo: não mexe
  })

  it('formatPhone mostra o número colado com +55 sem o DDI', () => {
    expect(formatPhone('+55 44 91234-5678')).toBe('(44) 91234-5678')
    expect(formatPhone('+5544912345678')).toBe('(44) 91234-5678')
  })

  it('formatPhone formata o número colado com DDI', () => {
    expect(formatPhone('5544991234567')).toBe('(44) 99123-4567')
  })

  it('aceita só celular com DDD e 9 na frente', () => {
    expect(telefoneValido('(44) 99123-4567')).toBe(true)
    expect(telefoneValido('+55 44 99123-4567')).toBe(true)
    expect(telefoneValido('(44) 3123-4567')).toBe(false)
    expect(telefoneValido('(44) 89123-4567')).toBe(false)
    expect(telefoneValido('99123-4567')).toBe(false)
    expect(telefoneValido('(04) 99123-4567')).toBe(false)
  })
})
