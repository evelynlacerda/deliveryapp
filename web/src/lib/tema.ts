import type { ChaveCor, Cores, TemaCores, TemaCoresAdmin } from '@/types/types'

export type Escopo = 'publico' | 'admin'
export type Modo = 'claro' | 'escuro'
export type ChaveTema = ChaveCor | 'barraLateral'
export type Paleta = Record<ChaveCor, string> & { barraLateral: string }

export const ESCOPOS: { id: Escopo; rotulo: string }[] = [
  { id: 'publico', rotulo: 'Aplicativo de pedidos' },
  { id: 'admin', rotulo: 'Painel do admin' },
]
export const MODOS: { id: Modo; rotulo: string }[] = [
  { id: 'claro', rotulo: 'Modo claro' },
  { id: 'escuro', rotulo: 'Modo escuro' },
]

export const ROTULOS_COR: Record<ChaveTema, { rotulo: string; dica: string }> = {
  fundo: { rotulo: 'Fundo da página', dica: 'Cor de fundo das telas.' },
  texto: { rotulo: 'Texto', dica: 'Cor principal dos textos e títulos.' },
  cartao: { rotulo: 'Cartões e campos', dica: 'Fundo de caixas, formulários e cards.' },
  primaria: { rotulo: 'Botões principais', dica: 'Botões de ação (ex.: Fazer pedido, Salvar).' },
  destaque: { rotulo: 'Destaque', dica: 'Seleções, números dos passos e detalhes de marca.' },
  textoSecundario: { rotulo: 'Texto secundário', dica: 'Descrições e textos de apoio.' },
  borda: { rotulo: 'Bordas', dica: 'Linhas e contornos.' },
  barraLateral: { rotulo: 'Barra lateral', dica: 'Menu lateral do painel do admin.' },
}

export const CHAVES_PUBLICO: ChaveTema[] = ['fundo', 'texto', 'cartao', 'primaria', 'destaque', 'textoSecundario', 'borda']
export const CHAVES_ADMIN: ChaveTema[] = [...CHAVES_PUBLICO, 'barraLateral']

export const PADRAO: Record<Modo, Paleta> = {
  claro: {
    fundo: '#f6f6f6',
    texto: '#060606',
    cartao: '#ffffff',
    primaria: '#060606',
    destaque: '#d79489',
    textoSecundario: '#565d62',
    borda: '#d2d6d8',
    barraLateral: '#060606',
  },
  escuro: {
    fundo: '#060606',
    texto: '#fee8d0',
    cartao: '#121314',
    primaria: '#d79489',
    destaque: '#d79489',
    textoSecundario: '#a3a9ad',
    borda: '#2a2d30',
    barraLateral: '#0c0d0e',
  },
}

const HEX = /^#[0-9a-f]{6}$/i
export const corValida = (v: unknown): v is string => typeof v === 'string' && HEX.test(v)

function luminancia(hex: string) {
  const canal = (i: number) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * canal(0) + 0.7152 * canal(1) + 0.0722 * canal(2)
}

export function corSobre(fundo: string): string {
  const l = luminancia(fundo)
  const contrasteComPreto = (l + 0.05) / 0.05
  const contrasteComBranco = 1.05 / (l + 0.05)
  return contrasteComPreto >= contrasteComBranco ? '#060606' : '#ffffff'
}

export function paletaEfetiva(modo: Modo, personalizada?: TemaCoresAdmin): Paleta {
  const resultado: Paleta = { ...PADRAO[modo] }
  for (const [chave, valor] of Object.entries(personalizada ?? {})) {
    if (chave in resultado && corValida(valor)) resultado[chave as ChaveTema] = valor.toLowerCase()
  }
  return resultado
}

export function variaveisCss(escopo: Escopo, paleta: Paleta): Record<string, string> {
  const vars: Record<string, string> = {
    '--background': paleta.fundo,
    '--foreground': paleta.texto,
    '--card': paleta.cartao,
    '--card-foreground': paleta.texto,
    '--popover': paleta.cartao,
    '--popover-foreground': paleta.texto,
    '--primary': paleta.primaria,
    '--primary-foreground': corSobre(paleta.primaria),
    '--accent': paleta.destaque,
    '--accent-foreground': corSobre(paleta.destaque),
    '--secondary': 'color-mix(in srgb, var(--accent) 18%, var(--background))',
    '--secondary-foreground': paleta.texto,
    '--muted': 'color-mix(in srgb, var(--foreground) 7%, var(--background))',
    '--muted-foreground': paleta.textoSecundario,
    '--border': paleta.borda,
    '--input': paleta.borda,
    '--ring': paleta.destaque,
  }
  if (escopo === 'admin') {
    Object.assign(vars, {
      '--sidebar': paleta.barraLateral,
      '--sidebar-foreground': corSobre(paleta.barraLateral),
      '--sidebar-primary': paleta.destaque,
      '--sidebar-primary-foreground': corSobre(paleta.destaque),
      '--sidebar-accent': 'color-mix(in srgb, var(--sidebar-foreground) 12%, var(--sidebar))',
      '--sidebar-accent-foreground': 'var(--sidebar-foreground)',
      '--sidebar-border': 'color-mix(in srgb, var(--sidebar-foreground) 15%, var(--sidebar))',
      '--sidebar-ring': paleta.destaque,
    })
  }
  return vars
}

export function gerarCss(cores: Cores | null): string {
  if (!cores) return ''
  const blocos: string[] = []

  for (const escopo of ['publico', 'admin'] as Escopo[]) {
    for (const modo of ['claro', 'escuro'] as Modo[]) {
      const personalizada: TemaCores | undefined = cores[escopo]?.[modo]
      if (!personalizada || Object.keys(personalizada).length === 0) continue

      const vars = variaveisCss(escopo, paletaEfetiva(modo, personalizada))
      const seletor = `:root[data-escopo='${escopo}']${modo === 'claro' ? ':not(.dark)' : '.dark'}`
      const declaracoes = Object.entries(vars).map(([k, v]) => `${k}:${v};`).join('')
      blocos.push(`${seletor}{${declaracoes}}`)
    }
  }
  return blocos.join('\n')
}

export function coresParaSalvar(rascunho: Record<Escopo, Record<Modo, Paleta>>): Cores | null {
  const saida: Cores = {}
  for (const escopo of ['publico', 'admin'] as Escopo[]) {
    for (const modo of ['claro', 'escuro'] as Modo[]) {
      const chaves = escopo === 'admin' ? CHAVES_ADMIN : CHAVES_PUBLICO
      const diferentes: TemaCoresAdmin = {}
      for (const chave of chaves) {
        const valor = rascunho[escopo][modo][chave].toLowerCase()
        if (valor !== PADRAO[modo][chave]) diferentes[chave as keyof TemaCoresAdmin] = valor
      }
      if (Object.keys(diferentes).length > 0) {
        saida[escopo] = { ...saida[escopo], [modo]: diferentes }
      }
    }
  }
  return Object.keys(saida).length > 0 ? saida : null
}

export function rascunhoDeCores(cores: Cores | null): Record<Escopo, Record<Modo, Paleta>> {
  return {
    publico: { claro: paletaEfetiva('claro', cores?.publico?.claro), escuro: paletaEfetiva('escuro', cores?.publico?.escuro) },
    admin: { claro: paletaEfetiva('claro', cores?.admin?.claro), escuro: paletaEfetiva('escuro', cores?.admin?.escuro) },
  }
}
