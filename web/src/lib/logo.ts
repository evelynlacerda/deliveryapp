import type { Marca } from '@/types/types'

export type ModoLogo = 'claro' | 'escuro'

export interface VarianteLogo {
  aparece: 'claro' | 'escuro' | 'sempre'
  imagem: { modo: ModoLogo; versao: number } | null
}

export function variantesDaLogo(marca: Pick<Marca, 'logoVersao' | 'logoEscuraVersao'>, tema: 'auto' | 'escuro' = 'auto'): VarianteLogo[] {
  const claro = marca.logoVersao ?? null
  const escuro = marca.logoEscuraVersao ?? null

  if (tema === 'escuro') {
    if (escuro) return [{ aparece: 'sempre', imagem: { modo: 'escuro', versao: escuro } }]
    if (claro) return [{ aparece: 'sempre', imagem: { modo: 'claro', versao: claro } }]
    return [{ aparece: 'sempre', imagem: null }]
  }

  if (claro && escuro) {
    return [
      { aparece: 'claro', imagem: { modo: 'claro', versao: claro } },
      { aparece: 'escuro', imagem: { modo: 'escuro', versao: escuro } },
    ]
  }
  if (claro) return [{ aparece: 'sempre', imagem: { modo: 'claro', versao: claro } }]
  if (escuro) {
    return [
      { aparece: 'claro', imagem: null },
      { aparece: 'escuro', imagem: { modo: 'escuro', versao: escuro } },
    ]
  }
  return [{ aparece: 'sempre', imagem: null }]
}
