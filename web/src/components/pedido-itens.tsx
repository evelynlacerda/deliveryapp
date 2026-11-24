import { Banknote, GlassWater } from 'lucide-react'
import { formatPrice, formatQtdItem, temItemADividir } from '@/lib/format'
import type { Pedido } from '@/types/types'

// Itens do pedido (admin e acompanhamento do cliente): sabores, bebidas e totais.
export function PedidoItens({ pedido: p, notaDividir }: { pedido: Pedido; notaDividir: string }) {
  return (
    <>
      <ul className="item-list mb-1.5">
        {p.itens.map((i) => (
          <li key={i.sabor}><span>{i.sabor}</span><span>{formatQtdItem(i.quantidade)}</span></li>
        ))}
      </ul>
      {/* Bebidas: uma linha separa dos salgados; entre as bebidas não há linha. */}
      {p.bebidas.length > 0 && (
        <div className="item-group">
          <h4 className="item-group__title mt-2 mb-1.5"><GlassWater className="size-4" /> Bebidas</h4>
          <ul className="item-list item-list--plain">
            {p.bebidas.map((b) => (
              <li key={b.nome}>
                <span>{b.quantidade}× {b.nome}</span>
                <span className="tabular-nums">{formatPrice(b.valor)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {temItemADividir(p.itens) && <p className="summary__note mt-2">{notaDividir}</p>}

      <dl className="summary__rows mt-3 mb-0 border-b-0 pb-0">
        <div className="summary__row"><dt>Subtotal ({p.quantidadeTotal} un.)</dt><dd>{formatPrice(p.subtotal)}</dd></div>
        {p.bebidas.length > 0 && <div className="summary__row"><dt>Bebidas</dt><dd>{formatPrice(p.totalBebidas)}</dd></div>}
        <div className="summary__row"><dt>Entrega</dt><dd>{parseFloat(p.taxaEntrega) === 0 ? 'Grátis' : formatPrice(p.taxaEntrega)}</dd></div>
        <div className="summary__row summary__row--total"><dt className="inline-flex items-center gap-1.5"><Banknote className="size-4" /> Total</dt><dd>{formatPrice(p.total)}</dd></div>
      </dl>
    </>
  )
}
