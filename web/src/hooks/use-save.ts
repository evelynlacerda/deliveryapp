import { useState } from 'react'

export function useSave() {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  async function run(action: () => Promise<unknown>) {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      await action()
      setSaved(true)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.')
      return false
    } finally {
      setSaving(false)
    }
  }

  return {
    saving,
    error,
    saved,
    run,
    fail: (message: string) => {
      setSaved(false)
      setError(message)
    },
    reset: () => {
      setSaved(false)
      setError('')
    },
  }
}
