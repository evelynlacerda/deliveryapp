import { describe, expect, it } from 'vitest'
import { calcularPreco, quantidadeValida } from '@/lib/preco'
import type { TaxasEntrega, Valores } from '@/types/types'

const valores: Valores = {
  faixas: [
    { quantidade: 10, valor: '13.00' },
    { quantidade: 20, valor: '20.00' },
    { quantidade: 30, valor: '29.00' },
    { quantidade: 40, valor: '35.00' },
    { quantidade: 50, valor: '39.00' },
    { quantidade: 60, valor: '44.00' },
    { quantidade: 70, valor: '49.00' },
    { quantidade: 80, valor: '55.00' },
    { quantidade: 90, valor: '59.00' },
    { quantidade: 100, valor: '64.00' },
  ],
  acimaDe: { quantidade: 100, valorPorUnidade: '0.64' },
  quantidadeMinima: 10,
  quantidadeMaxima: 1000,
  passo: 10,
}
const taxas: TaxasEntrega = { taxaAte49: '7.00', taxaDe50a199: '5.00', entregaGratisAPartirDe: 200 }

describe('calcularPreco (prévia do pedido)', () => {
  it('10 unidades: retirada R$ 13,00 e entrega R$ 20,00', () => {
    expect(calcularPreco(10, 'RETIRADA', valores, taxas).total).toBe(13)
    expect(calcularPreco(10, 'ENTREGA', valores, taxas)).toEqual({ subtotal: 13, taxa: 7, total: 20 })
  })

  it('50 unidades com entrega usa a taxa da faixa de 50 a 199 (R$ 44,00)', () => {
    expect(calcularPreco(50, 'ENTREGA', valores, taxas)).toEqual({ subtotal: 39, taxa: 5, total: 44 })
  })

  it('acima de 100 unidades cobra por unidade (110 retirada = R$ 70,40; 190 entrega = R$ 126,60)', () => {
    expect(calcularPreco(110, 'RETIRADA', valores, taxas).total).toBe(70.4)
    expect(calcularPreco(190, 'ENTREGA', valores, taxas).total).toBe(126.6)
  })

  it('entrega é grátis a partir de 200 unidades (R$ 128,00)', () => {
    expect(calcularPreco(200, 'ENTREGA', valores, taxas)).toEqual({ subtotal: 128, taxa: 0, total: 128 })
  })
})

describe('quantidadeValida', () => {
  it('aceita só múltiplos de 10 entre 10 e 1000', () => {
    expect(quantidadeValida(10, valores)).toBe(true)
    expect(quantidadeValida(1000, valores)).toBe(true)
    for (const invalida of [0, 5, 15, 10.5, 1010, NaN]) expect(quantidadeValida(invalida, valores)).toBe(false)
  })
})
