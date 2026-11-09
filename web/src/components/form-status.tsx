import { Check } from 'lucide-react'

export function FormStatus({ error, saved }: { error?: string; saved?: boolean }) {
  if (error) return <p role="alert" className="alert alert--error">{error}</p>
  if (saved) {
    return (
      <p role="status" className="form-saved">
        <Check className="size-4" /> Salvo!
      </p>
    )
  }
  return null
}
