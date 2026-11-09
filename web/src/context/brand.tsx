import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '@/lib/api'
import { gerarCss } from '@/lib/tema'
import type { Marca } from '@/types/types'

const CACHE_KEY = 'deliveryApp:marca'
const STYLE_ID = 'marca-tema'

export const MARCA_PADRAO: Marca = { nome: 'DeliveryApp', logoVersao: null, logoEscuraVersao: null, cores: null }

function lerCache(): Marca | null {
  try {
    const bruto = localStorage.getItem(CACHE_KEY)
    if (!bruto) return null
    const m = JSON.parse(bruto) as Marca
    return typeof m?.nome === 'string' ? m : null
  } catch {
    return null
  }
}

function gravarCache(marca: Marca) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(marca))
  } catch {
  }
}

export function aplicarMarca(marca: Marca) {
  let estilo = document.getElementById(STYLE_ID)
  if (!estilo) {
    estilo = document.createElement('style')
    estilo.id = STYLE_ID
    document.head.appendChild(estilo)
  }
  estilo.textContent = gerarCss(marca.cores)
  document.title = marca.nome
}

export const escopoDaRota = (pathname: string) => (pathname.startsWith('/admin') ? 'admin' : 'publico')

export function aplicarMarcaInicial() {
  document.documentElement.dataset.escopo = escopoDaRota(window.location.pathname)
  const cache = lerCache()
  if (cache) aplicarMarca(cache)
}

interface BrandContextValue {
  marca: Marca
  atualizar: (marca: Marca) => void
}

const BrandContext = createContext<BrandContextValue | null>(null)

export function BrandProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const [marca, setMarca] = useState<Marca>(() => lerCache() ?? MARCA_PADRAO)

  useLayoutEffect(() => {
    document.documentElement.dataset.escopo = escopoDaRota(pathname)
  }, [pathname])

  const atualizar = useCallback((nova: Marca) => {
    setMarca(nova)
    gravarCache(nova)
    aplicarMarca(nova)
  }, [])

  useEffect(() => {
    let ativo = true
    api
      .marca()
      .then((m) => ativo && atualizar(m))
      .catch(() => {
      })
    return () => {
      ativo = false
    }
  }, [atualizar])

  const value = useMemo(() => ({ marca, atualizar }), [marca, atualizar])
  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBrand() {
  const ctx = useContext(BrandContext)
  if (!ctx) throw new Error('useBrand deve ser usado dentro de BrandProvider')
  return ctx
}
