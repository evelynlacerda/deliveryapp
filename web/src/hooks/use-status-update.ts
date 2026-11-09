import { useState } from 'react'
import { api } from '@/lib/api'
import type { PedidoAdmin, StatusPedido } from '@/types/types'

export function useStatusUpdate(onUpdated: (pedido: PedidoAdmin) => void) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function update(codigo: string, status: StatusPedido) {
    setBusy(codigo)
    setError('')
    try {
      onUpdated(await api.atualizarStatus(codigo, status))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível atualizar o status.')
    } finally {
      setBusy(null)
    }
  }

  return { update, busy, error }
}
