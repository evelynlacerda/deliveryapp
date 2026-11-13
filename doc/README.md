# Documentação do projeto

Site de documentação independente do projeto principal.

## Rodar

```bash
cd doc
npm install
npm run dev      # http://localhost:4321
```

## Editar textos

Todo o conteúdo está em `content/pt-br.json` e `content/en-us.json`. Os dois arquivos precisam ter a mesma estrutura (mesmas seções, ids e tipos de bloco); só o texto muda. Depois de editar, rode:

```bash
npm run check    # confere se os dois idiomas estão sincronizados
```

## Visual

A paleta é neutra (cinza, preto e branco), com tema claro e escuro. Os tons ficam nas variáveis CSS no topo de `src/styles.css`. No topo, `PTBR`/`ENUS` troca o idioma e o ícone de sol/lua troca o tema. A sidebar pode ser recolhida pelo botão redondo sobre a linha dela.

## Publicar

`npm run build` gera a pasta `dist/`, que pode ser publicada em qualquer hospedagem estática (Vercel, Netlify, GitHub Pages).
