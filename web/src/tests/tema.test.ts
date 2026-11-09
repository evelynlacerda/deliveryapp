import { describe, expect, it } from 'vitest'
import { coresParaSalvar, corSobre, gerarCss, PADRAO, paletaEfetiva, rascunhoDeCores } from '@/lib/tema'

describe('corSobre (contraste do texto)', () => {
  it('usa texto escuro sobre fundo claro e texto claro sobre fundo escuro', () => {
    expect(corSobre('#ffffff')).toBe('#060606')
    expect(corSobre('#fee8d0')).toBe('#060606')
    expect(corSobre('#060606')).toBe('#ffffff')
    expect(corSobre('#112244')).toBe('#ffffff')
  })
})

describe('gerarCss', () => {
  it('sem personalização não gera CSS (vale o tema padrão)', () => {
    expect(gerarCss(null)).toBe('')
    expect(gerarCss({ publico: { claro: {} } })).toBe('')
  })

  it('gera regras separadas por escopo e modo, completando com o padrão', () => {
    const css = gerarCss({
      publico: { claro: { destaque: '#ff0000' }, escuro: { fundo: '#101820' } },
      admin: { claro: { barraLateral: '#223344' } },
    })

    expect(css).toContain(":root[data-escopo='publico']:not(.dark){")
    expect(css).toContain(":root[data-escopo='publico'].dark{")
    expect(css).toContain(":root[data-escopo='admin']:not(.dark){")
    expect(css).not.toContain(":root[data-escopo='admin'].dark")
    expect(css).toContain('--accent:#ff0000;')
    expect(css).toContain(`--background:${PADRAO.claro.fundo};`)
    expect(css).toContain('--sidebar:#223344;')
    expect(css.split('\n')[0]).not.toContain('--sidebar:')
  })

  it('ignora valores que não sejam #rrggbb (nada de injetar CSS)', () => {
    const css = gerarCss({ publico: { claro: { destaque: 'red; } body { display:none', fundo: '#12345' } } })

    expect(css).not.toContain('display:none')
    expect(css).toContain(`--accent:${PADRAO.claro.destaque};`)
    expect(paletaEfetiva('claro', { fundo: 'url(x)' }).fundo).toBe(PADRAO.claro.fundo)
  })
})

describe('coresParaSalvar', () => {
  it('só envia o que difere do padrão, e null quando nada mudou', () => {
    const rascunho = rascunhoDeCores(null)
    expect(coresParaSalvar(rascunho)).toBeNull()

    rascunho.publico.escuro.destaque = '#00FF99'
    rascunho.admin.claro.barraLateral = '#112233'

    expect(coresParaSalvar(rascunho)).toEqual({
      publico: { escuro: { destaque: '#00ff99' } },
      admin: { claro: { barraLateral: '#112233' } },
    })
  })
})
