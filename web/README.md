# Web — DeliveryApp (delivery de mini salgados)

Front do app de pedidos: a página do cliente (`/pedido`) e o painel do lojista (`/admin`). Ele só conversa com a [API](../api/README.md); visão geral do projeto no [README da raiz](../README.md).

- **Stack:** React 19, TypeScript, Vite, React Router, Tailwind CSS v4, shadcn/ui (Base UI), lucide-react e Vitest.
- **Idioma:** interface em português do Brasil. Funciona em computador, tablet e celular, com tema claro e escuro.
- **Paleta:** `#060606` `#565D62` `#D2D6D8` `#D79489` `#FEE8D0` (tokens em `src/styles/index.css`).

## Requisitos

- Node.js 24 e npm.
- A API rodando (local ou em produção). Veja o [README da API](../api/README.md).

## Rodar localmente

```bash
git clone <url-do-repositorio>
cd deliveryapp/web

npm install
cp .env.example .env        # opcional; no Windows (PowerShell): Copy-Item .env.example .env
npm run dev                 # http://localhost:5173
```

- Suba a API antes (`cd ../api && npm run dev`, porta 3333). Sem ela as páginas mostram "Não foi possível conectar ao servidor".
- **Use a porta 5173.** O CORS da API só libera `WEB_URL`, que por padrão é `http://localhost:5173`. Se o Vite subir em outra porta (a 5173 já está em uso), feche o outro processo ou ajuste `WEB_URL` na API.
- Páginas: cliente em `http://localhost:5173/pedido`, lojista em `http://localhost:5173/admin/login` (usuário e senha definidos no `.env` da API, em `ADMIN_USER` e `ADMIN_PASSWORD`).

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `API_URL` | não | URL da API, **sem barra no final**. Padrão `http://localhost:3333`. |

> As variáveis `VITE_*` entram **no momento do build**. Se mudar `API_URL` na Vercel, é preciso fazer um novo deploy. Nunca coloque segredos aqui: tudo que é `VITE_*` fica visível no navegador.

O WhatsApp do estabelecimento, a chave Pix, o favorecido e o banco **não** são variáveis: são cadastrados no painel (**Pix e contato**) e vêm da API.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com recarga. |
| `npm run build` | Confere os tipos (`tsc -b`) e gera o build de produção em `dist/`. |
| `npm run preview` | Serve o build localmente para conferir. |
| `npm run lint` | Oxlint. |
| `npm test` / `npm run test:watch` | Testes (Vitest) das regras do front. |

## Rotas

| Rota | Quem acessa | O que é |
|---|---|---|
| `/` | todos | Redireciona para `/pedido`. |
| `/pedido` | cliente | Quantidade, sabores, entrega/retirada, quando, dados e pagamento. Mostra o horário de atendimento e avisa quando estamos fechados, fora do horário ou sem entrega no dia. |
| `/pedido/:codigo` | cliente | Acompanhamento do pedido; no Pix mostra chave, valor e botão do WhatsApp. |
| `/admin/login` | lojista | Login (usuário e senha da API; o token fica no `localStorage`). |
| `/admin/dashboard` | admin | Pedidos do dia, filtros e avanço de status. |
| `/admin/pedidos/:codigo` | admin | Detalhe, status, aprovar pagamento Pix, tempo de preparo e WhatsApp do cliente. |
| `/admin/sabores` | admin | Criar, renomear e ativar/desativar sabores. |
| `/admin/precos` | admin | Tabela de preços, taxas de entrega e tempo de preparo. |
| `/admin/funcionamento` | admin | Horário de atendimento, "Estabelecimento fechado" e liga/desliga da entrega de hoje. |
| `/admin/configuracoes` | admin | Nome da marca, logos (PNG/SVG, uma para o modo claro e outra para o escuro) e cores (aplicativo de pedidos e painel, claro e escuro). |
| `/admin/pix` | admin | WhatsApp do estabelecimento, chave Pix, favorecido, banco e prazo de pagamento. |

Rotas `/admin/*` (exceto o login) redirecionam para o login quando não há token ou quando a API responde 401.

## Estrutura

```
web/src/
├── pages/            order/ (cliente) e admin/ (painel)
├── components/       componentes da aplicação; ui/ = shadcn
├── context/          autenticação do admin
├── hooks/            useFetch, useSave, useStatusUpdate
├── lib/              api.ts (cliente HTTP), regras (preco, prazo-pix, funcionamento), formatação e alerta sonoro
├── tests/            testes (Vitest) das regras de lib/
├── types/            tipos espelhando o contrato da API
└── styles/
    ├── index.css     Tailwind, tokens de cor (:root e .dark) e base
    ├── imports.css   lista os CSS de componentes
    └── components/   um CSS por área (layout, form, order, tracking, dashboard...)
```

Todo o acesso à API passa por `src/lib/api.ts`. O preço mostrado ao cliente é só uma **prévia**; o valor oficial é calculado pela API ao criar o pedido.

## Testes

```bash
npm test
```

Testam as regras do front: prévia de preço, prazo de pagamento do Pix, fluxo de status, máscaras e link do WhatsApp. Não usam rede nem banco. No GitHub, o workflow `.github/workflows/web-tests.yml` roda build + testes a cada push/PR que mexa em `web/`.

## Deploy (Vercel)

1. Crie um projeto na Vercel apontando para este repositório com **Root Directory = `web`**. O framework (Vite) é detectado sozinho.
2. Defina `API_URL` com a URL da API em produção (sem barra no final).
3. Faça o deploy. O `vercel.json` desta pasta redireciona qualquer rota para o `index.html`; sem ele, abrir ou recarregar `/pedido/CODIGO` ou `/admin/dashboard` daria 404.
4. Na API, confirme que `WEB_URL` é exatamente a URL deste front (senão o navegador bloqueia as chamadas por CORS).

## Adicionar componentes shadcn

O projeto usa `components.json` (estilo `base-nova`, CSS em `src/styles/index.css`):

```bash
npx shadcn@latest add <componente>
```
