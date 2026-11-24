# DeliveryApp — demo ordering app for a mini savory snacks shop

🇺🇸 English · 🇧🇷 [Leia em português](README.pt-BR.md)

A portfolio project: a delivery app for a single store, with a customer ordering page and an admin panel. **Everything here is a demo and open to the public**: the data is fictional, anyone can try the panel, and all orders are deleted every day.

> **Live demo:** [deliveryapp-demo.vercel.app](https://deliveryapp-demo.vercel.app/pedido) |
> **Documentation:** [deliveryapp-doc.vercel.app](https://deliveryapp-doc.vercel.app) |
> **Panel test login:** user `admin123` · password `123deliveryapp!`

The app interface is in Brazilian Portuguese. The READMEs inside `api/`, `web/` and `doc/` are also in Portuguese.

## What the app does

- **Customer** (`/pedido`): builds an order by quantity and flavors (and drinks, if the store sells them), chooses delivery or pickup (with a scheduled time, if desired), pays with cash, card (in person) or Pix, and follows the order's progress.
- **Store owner** (`/admin`): sees orders in real time (with a sound alert), filters them and changes their status, and configures flavors, drinks, prices, delivery fees, opening hours, Pix, name, logo and colors.
- Light and dark themes, Brazilian Portuguese interface, works on desktop, tablet and phone.
- Prices are always calculated on the server; the front end is never the source of truth.

## How to try the demo

1. Open the order page and place a test order (use made-up data).
2. Log into the panel at `/admin/login` with the test login above and follow the order.
3. Explore the settings. Some data is **intentionally fixed** in this demo, see below.

### Demo limits (for safety)

Since the panel is public, the app runs with `MODO_DEMO=true`:

| What | Behavior |
|---|---|
| Business name | Fixed as "DeliveryApp" |
| Pix key, beneficiary, bank and WhatsApp | Fixed and fictional (key `12345678900`), so nobody registers their own data. The panel warns that they are unchanged for safety. Only the Pix payment deadline is editable. |
| Orders | All deleted once a day (cron at 03:00 UTC, midnight in Brasília) so the database doesn't fill up |
| Other settings (prices, flavors, hours, colors, logo) | Editable by any visitor |

Do not enter real personal data. Nothing submitted should be considered private.

## Tech stack

| Folder | What it is | Details |
|---|---|---|
| [`api/`](api/README.md) | REST API: Node.js 24, Fastify 5, TypeScript, Prisma 7, PostgreSQL (Neon), Zod, JWT | business rules in [`api/APP.md`](api/APP.md) |
| [`web/`](web/README.md) | Front end: React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui | customer page and admin panel |

Also: automated tests with Vitest (API and web), GitHub Actions to run the tests, and deployment on Vercel (two projects) with the database on Neon.

## Documentation

The full project documentation is at [deliveryapp-doc.vercel.app](https://deliveryapp-doc.vercel.app). Its source lives in [`doc/`](doc/README.md); to run it locally, use `cd doc && npm install && npm run dev`.

## Running locally

Prerequisites: **Node.js 24** and a PostgreSQL database.

```bash
git clone https://github.com/evelynlacerda/deliveryapp.git
cd deliveryapp
```

**1. API** (terminal 1)

```bash
cd api
npm install
cp .env.example .env     # fill in DATABASE_URL, JWT_SECRET, ADMIN_USER=admin123 and ADMIN_PASSWORD=123deliveryapp!
npm run db:deploy        # creates the tables
npm run db:seed:demo     # fictional data, flavors, prices and the test admin
npm run dev              # http://localhost:3333
```

**2. Web** (terminal 2)

```bash
cd web
npm install
npm run dev              # http://localhost:5173
```

**3. Open**

- Customer: <http://localhost:5173/pedido>
- Panel: <http://localhost:5173/admin/login> (the test login is shown on the screen itself)

### Using it as a real app (without the demo locks)

In the API, set `MODO_DEMO=false` and run `npm run db:seed` (instead of `db:seed:demo`, which overwrites the configuration). Then, under **Pix e contato** (Pix and contact), register the WhatsApp number, Pix key, beneficiary and bank; without a key, the Pix option is hidden from customers. Also replace `ADMIN_USER` and `ADMIN_PASSWORD` with your own credentials.

## Demo environment variables (API)

| Variable | Purpose |
|---|---|
| `MODO_DEMO` | `true` (default) locks name, Pix, beneficiary, bank and WhatsApp. `false` unlocks them. |
| `CRON_SECRET` | Secret (at least 16 characters) that Vercel Cron sends when calling `GET /cron/limpar-pedidos`. Without it, the daily cleanup is disabled. |
| `ADMIN_USER`, `ADMIN_PASSWORD` | Login created by the seed. In the demo: `admin123` / `123deliveryapp!`. |

The full list is in [`api/README.md`](api/README.md).

## Tests

```bash
cd api && npm test      # needs DATABASE_TESTS_URL (a separate database) in .env
cd web && npm test      # needs nothing
```

GitHub Actions runs both automatically (`.github/workflows/`). Details are in each README.

## Deployment

API and web are **two Vercel projects** (Root Directory `api` and `web`), with the database on Neon. The variables and steps for each project are in [`api/README.md`](api/README.md) and [`web/README.md`](web/README.md); the API needs `WEB_URL` set to the front end's URL, and the front end needs `VITE_API_URL` set to the API's URL. The daily cleanup schedule is in `api/vercel.json`.

When publishing the demo on a database that already had real data, run `npm run db:seed:demo` once in the `api` folder: it overwrites configuration, contact, address, logo and colors with sample values and deletes the orders.

## Structure

```
deliveryapp/
├── .github/workflows/   API and web tests (GitHub Actions)
├── api/                 backend
├── doc/                 project documentation (Vite), published on Vercel
├── web/                 frontend
├── README.md            this file (main, English)
└── README.pt-BR.md      Portuguese (Brazil) version
```

## Author

Made by Evelyn Lacerda as a portfolio project. The names, addresses, phone numbers and payment data shown in the app are fictional.
