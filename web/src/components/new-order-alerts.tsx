import { Link } from 'react-router-dom'
import { Bell, BellOff, BellRing, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNewOrderAlerts } from '@/hooks/use-new-order-alerts'
import { formatPrice } from '@/lib/format'

export function NewOrderAlerts() {
  const { soundOn, alerts, toggleSound, dismiss, dismissAll } = useNewOrderAlerts()
  const label = soundOn ? 'Desligar o som de novos pedidos' : 'Ligar o som de novos pedidos'

  return (
    <>
      <Button variant="ghost" size="icon" onClick={toggleSound} aria-pressed={soundOn} aria-label={label} title={label}>
        {soundOn ? <Bell /> : <BellOff />}
      </Button>

      {alerts.length > 0 && (
        <div className="order-alerts" role="region" aria-label="Avisos de novos pedidos" aria-live="polite">
          {alerts.map((p) => (
            <div key={p.codigo} className="order-alert">
              <BellRing className="order-alert__icon" />
              <div className="order-alert__body">
                <p className="order-alert__title">Novo pedido!</p>
                <p className="order-alert__text">
                  {p.nomeCliente} · {p.quantidadeTotal} un. · {formatPrice(p.total)}
                </p>
                <Link to={`/admin/pedidos/${p.codigo}`} onClick={() => dismiss(p.codigo)} className="order-alert__link">
                  Ver pedido {p.codigo}
                </Link>
              </div>
              <button type="button" className="order-alert__close" aria-label="Dispensar aviso" onClick={() => dismiss(p.codigo)}>
                <X />
              </button>
            </div>
          ))}

          {alerts.length > 1 && (
            <button type="button" className="order-alerts__clear" onClick={dismissAll}>
              Dispensar todos
            </button>
          )}
        </div>
      )}
    </>
  )
}
