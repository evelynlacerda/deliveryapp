# Sabor de Mãe — app de pedidos de mini salgados

Aplicação de delivery para uma única loja (sem multi-tenant): o cliente monta o pedido pela quantidade e pelos sabores, escolhe entrega ou retirada, paga em dinheiro, cartão (presencial) ou Pix (copia a chave e envia o comprovante por WhatsApp), e o lojista acompanha tudo em um painel.

| Pasta | O que é | Detalhes |
|---|---|---|
| [`api/`](api/README.md) | API REST: Node.js, Fastify, Prisma, PostgreSQL (Neon) | regras de negócio em [`api/APP.md`](api/APP.md) |
| [`web/`](web/README.md) | Front: React, TypeScript, Vite, Tailwind, shadcn/ui | páginas do cliente e painel do admin |

## Rodar localmente (resumo)

Pré-requisitos: **Node.js 24** e um banco PostgreSQL (use um banco gratuito do [Neon](https://neon.tech)).

```bash
git clone <url-do-repositorio>
cd deliveryapp
```

**1. API** (terminal 1)

```bash
cd api
npm install
cp .env.example .env     # preencha DATABASE_URL, JWT_SECRET, ADMIN_USER e ADMIN_PASSWORD
npm run db:deploy        # cria as tabelas
npm run db:seed          # dados iniciais e usuário admin
npm run dev              # http://localhost:3333
```

**2. Web** (terminal 2)

```bash
cd web
npm install
npm run dev              # http://localhost:5173
```

**3. Abrir**

- Cliente: <http://localhost:5173/pedido>
- Lojista: <http://localhost:5173/admin/login> (usuário e senha do `.env` da API)

No primeiro acesso ao painel, abra **Pix e contato** e cadastre WhatsApp, chave Pix, favorecido e banco; sem a chave, a opção Pix fica escondida para os clientes.

## Testes

```bash
cd api && npm test      # precisa de DATABASE_TESTS_URL (banco separado) no .env
cd web && npm test      # não precisa de nada
```

O GitHub Actions roda os dois automaticamente (`.github/workflows/`). Detalhes em cada README.

## Deploy

API e web são **dois projetos na Vercel** (Root Directory `api` e `web`), com o banco no Neon. As variáveis e os passos de cada projeto estão em [`api/README.md`](api/README.md) e [`web/README.md`](web/README.md); a API precisa de `WEB_URL` com a URL do front e o front de `API_URL` com a URL da API.

## Estrutura

```
deliveryapp/
├── .github/workflows/   testes da API e do web (GitHub Actions)
├── api/                 backend
├── web/                 frontend
└── README.md            este arquivo
```
