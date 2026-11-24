// Chave liga/desliga (botão com role="switch"). Estilo em styles/components/funcionamento.css.
export function Switch({
  id,
  checked,
  disabled,
  onChange,
  label,
}: {
  id: string
  checked: boolean
  disabled?: boolean
  onChange: (valor: boolean) => void
  /** Nome acessível, quando não há um <label htmlFor> apontando para a chave. */
  label?: string
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className="switch"
      onClick={() => onChange(!checked)}
    >
      <span className="switch__thumb" />
    </button>
  )
}
