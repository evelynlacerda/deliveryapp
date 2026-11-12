# DeliveryApp — demo de app de pedidos de mini salgados

Projeto de portfólio: uma aplicação de delivery para uma única loja, com a página de pedidos do cliente e um painel de administração. **Tudo aqui é demonstrativo e aberto ao público**: os dados são fictícios, qualquer pessoa pode testar o painel e os pedidos são apagados todos os dias.

> **Demo online:** [deliveryapp-demo.vercel.app](https://deliveryapp-demo.vercel.app/pedido) | 
> **Login de teste do painel:** usuário `admin123` · senha `123deliveryapp!`

## O que o app faz

- **Cliente** (`/pedido`): monta o pedido por quantidade e sabores, escolhe entrega ou retirada (com horário agendado, se quiser), paga em dinheiro, cartão (presencial) ou Pix, e acompanha o andamento do pedido.
- **Lojista** (`/admin`): vê os pedidos em tempo real (com aviso sonoro), filtra e muda o status, e configura sabores, preços, taxas de entrega, horário de funcionamento, Pix, nome, logo e cores.
- Tema claro e escuro, interface em português do Brasil, funciona em computador, tablet e celular.
- O preço é sempre calculado no servidor; o front nunca é a fonte da verdade.

## Como testar a demo

1. Abra a página de pedidos e faça um pedido de teste (use dados inventados).
2. Entre no painel em `/admin/login` com o login de teste acima e acompanhe o pedido.
3. Explore as configurações. Alguns dados são **fixos de propósito** nesta demonstração, veja abaixo.

### Limites da demo (por segurança)

Como o painel é público, o app roda com `MODO_DEMO=true`:

| O quê | Comportamento |
|---|---|
| Nome do estabelecimento | Fixo em "DeliveryApp" |
| Chave Pix, favorecido, banco e WhatsApp | Fixos e fictícios (chave `12345678900`), para ninguém cadastrar os próprios dados. O painel avisa que estão inalterados por segurança. Só o prazo do pagamento Pix é editável. |
| Pedidos | Todos são apagados uma vez por dia (cron às 03:00 UTC, meia-noite em Brasília) para o banco não encher |
| Demais configurações (preços, sabores, horários, cores, logo) | Editáveis por qualquer visitante |

Não informe dados pessoais reais. Nada do que é enviado deve ser considerado privado.

## Tecnologias

| Pasta | O que é | Detalhes |
|---|---|---|
| [`api/`](api/README.md) | API REST: Node.js 24, Fastify 5, TypeScript, Prisma 7, PostgreSQL (Neon), Zod, JWT | regras de negócio em [`api/APP.md`](api/APP.md) |
| [`web/`](web/README.md) | Front: React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui | página do cliente e painel do admin |

Também: testes automatizados com Vitest (API e web), GitHub Actions para rodar os testes e deploy na Vercel (dois projetos) com o banco no Neon.

## Rodar localmente

Pré-requisitos: **Node.js 24** e um banco PostgreSQL.

```bash
git clone https://github.com/evelynlacerda/deliveryapp.git
cd deliveryapp
```

**1. API** (terminal 1)

```bash
cd api
npm install
cp .env.example .env     # preencha DATABASE_URL, JWT_SECRET, ADMIN_USER=admin123 e ADMIN_PASSWORD=123deliveryapp!
npm run db:deploy        # cria as tabelas
npm run db:seed:demo     # dados fictícios, sabores, preços e o admin de teste
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
- Painel: <http://localhost:5173/admin/login> (o login de teste aparece na própria tela)

### Usar como app de verdade (sem as travas da demo)

Na API, defina `MODO_DEMO=false` e rode `npm run db:seed` (em vez de `db:seed:demo`, que sobrescreve a configuração). Depois, em **Pix e contato**, cadastre WhatsApp, chave Pix, favorecido e banco; sem a chave, a opção Pix fica escondida para os clientes. Troque também `ADMIN_USER` e `ADMIN_PASSWORD` por credenciais próprias.

## Variáveis de ambiente da demo (API)

| Variável | Para quê |
|---|---|
| `MODO_DEMO` | `true` (padrão) trava nome, Pix, favorecido, banco e WhatsApp. `false` libera. |
| `CRON_SECRET` | Segredo (mínimo 16 caracteres) que a Vercel Cron envia ao chamar `GET /cron/limpar-pedidos`. Sem ele a limpeza diária fica desligada. |
| `ADMIN_USER`, `ADMIN_PASSWORD` | Login criado pelo seed. Na demo: `admin123` / `123deliveryapp!`. |

A lista completa está em [`api/README.md`](api/README.md).

## Testes

```bash
cd api && npm test      # precisa de DATABASE_TESTS_URL (banco separado) no .env
cd web && npm test      # não precisa de nada
```

O GitHub Actions roda os dois automaticamente (`.github/workflows/`). Detalhes em cada README.

## Deploy

API e web são **dois projetos na Vercel** (Root Directory `api` e `web`), com o banco no Neon. As variáveis e os passos de cada projeto estão em [`api/README.md`](api/README.md) e [`web/README.md`](web/README.md); a API precisa de `WEB_URL` com a URL do front e o front de `VITE_API_URL` com a URL da API. O agendamento da limpeza diária está em `api/vercel.json`.

Ao publicar a demo num banco que já tinha dados reais, rode uma vez `npm run db:seed:demo` na pasta `api`: ele sobrescreve configuração, contato, endereço, logo e cores com valores de exemplo e apaga os pedidos.

## Estrutura

```
deliveryapp/
├── .github/workflows/   testes da API e do web (GitHub Actions)
├── api/                 backend
├── web/                 frontend
└── README.md            este arquivo
```

## Autoria

Feito por Evelyn Lacerda como projeto de portfólio. Os nomes, endereços, telefones e dados de pagamento que aparecem no app são fictícios.
