import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Info, Lock } from 'lucide-react'
import { Brand } from '@/components/brand'
import { useBrand } from '@/context/brand'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/auth'

export default function LoginPage() {
  const { marca } = useBrand()
  const { isAdmin, login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)

  if (isAdmin) return <Navigate to="/admin/dashboard" replace />

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setError('')
    setLoading(true)
    try {
      await login(String(form.get('usuario') ?? '').trim(), String(form.get('senha') ?? ''))
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <ThemeToggle className="absolute right-4 top-4" />
      <div className="login-card">
        <div className="login-card__head">
          <Brand to="/pedido" showName={false} />
          <h1 className="login-card__title">Área do lojista</h1>
          <p className="login-card__text">
            {marca.nome} · entre para acompanhar os pedidos.
          </p>
        </div>
        <div role="note" className="alert alert--info flex items-start gap-2">
          <Info className="mt-0.5 size-4 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">
              Este é um app de demonstração. Para testar o painel, entre com:
            </p>
            <p>
              Usuário: <code className="font-mono font-semibold">admin123</code>
            </p>
            <p>
              Senha:{" "}
              <code className="font-mono font-semibold">123deliveryapp!</code>
            </p>
          </div>
        </div>
        <form onSubmit={submit} className="stack">
          <div className="field">
            <Label htmlFor="usuario">Usuário</Label>
            <Input
              id="usuario"
              name="usuario"
              autoComplete="username"
              required
            />
          </div>
          <div className="field">
            <Label htmlFor="senha">Senha</Label>
            <div className="relative">
              <Input
                id="senha"
                name="senha"
                type={mostrarSenha ? "text" : "password"}
                autoComplete="current-password"
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((v) => !v)}
                aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                aria-pressed={mostrarSenha}
                title={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {mostrarSenha ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>
          {error && (
            <p role="alert" className="alert alert--error">
              {error}
            </p>
          )}
          <Button type="submit" className="h-10" disabled={loading}>
            <Lock /> {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
