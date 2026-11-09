import type { TaxasEntrega, TipoEntrega, Valores } from '@/types/types'

const toCents = (v: string) => Math.round(parseFloat(v) * 100)

export function quantidadeValida(qtd: number, valores: Valores) {
  return (
    Number.isInteger(qtd) &&
    qtd >= valores.quantidadeMinima &&
    qtd <= valores.quantidadeMaxima &&
    qtd % valores.passo === 0
  )
}

export function calcularPreco(qtd: number, tipo: TipoEntrega, valores: Valores, taxas: TaxasEntrega) {
  let subtotal: number
  if (qtd > valores.acimaDe.quantidade) {
    subtotal = Math.round(qtd * parseFloat(valores.acimaDe.valorPorUnidade) * 100)
  } else {
    const faixa = valores.faixas.find((f) => f.quantidade === qtd)
    subtotal = faixa ? toCents(faixa.valor) : 0
  }

  let taxa = 0
  if (tipo === 'ENTREGA' && qtd < taxas.entregaGratisAPartirDe) {
    taxa = toCents(qtd >= 50 ? taxas.taxaDe50a199 : taxas.taxaAte49)
  }

  return { subtotal: subtotal / 100, taxa: taxa / 100, total: (subtotal + taxa) / 100 }
}
