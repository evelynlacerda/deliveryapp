# API — DeliveryApp (delivery de mini salgados)

API REST do app de pedidos. O front fica em [`../web`](../web/README.md); a visão geral do projeto está no [README da raiz](../README.md).

- **Stack:** Node.js 24, Fastify 5, TypeScript, Prisma 7 (PostgreSQL / Neon), Zod, JWT, Vitest.
- **Regras de negócio** (preços, quantidades, entrega, Pix, status): [`APP.md`](APP.md).
- O preço é sempre calculado no servidor; nada que o cliente envia sobre valores é usado.

## Requisitos

- Node.js 24 e npm.
- Um banco PostgreSQL. Usamos o [Neon](https://neon.tech) (plano gratuito basta).
- Para rodar os testes: um **segundo banco, separado** (por exemplo uma branch do Neon).

## Rodar localmente

```bash
git clone <url-do-repositorio>
cd deliveryapp/api

npm install                 # também gera o cliente do Prisma (postinstall)
cp .env.example .env        # no Windows (PowerShell): Copy-Item .env.example .env
# edite o .env (veja "Variáveis de ambiente" abaixo)

npm run db:deploy           # cria as tabelas (aplica as migrations existentes)
npm run db:seed             # sabores, tabela de preços, configuração e o usuário admin
npm run dev                 # http://localhost:3333
```

Confira em `GET http://localhost:3333/health` → `{ "status": "ok" }`.

O front espera a API em `http://localhost:3333` e o CORS só aceita a origem `WEB_URL` (padrão `http://localhost:5173`).

## Variáveis de ambiente

Copie `.env.example` para `.env` (o `.env` nunca vai para o git).

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | sim | Connection string do PostgreSQL. |
| `JWT_SECRET` | sim | Segredo do token do admin, mínimo de 32 caracteres. Gere com `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. |
| `WEB_URL` | não | Origem do front liberada no CORS (uma só, sem barra no final). Padrão `http://localhost:5173`. **Em produção, use a URL do front.** |
| `PORT` | não | Porta local (padrão `3333`). |
| `NODE_ENV` | não | `development`, `production` ou `test`. |
| `ADMIN_USER`, `ADMIN_PASSWORD` | só no seed | Login do admin criado/atualizado por `npm run db:seed`. |
| `MODO_DEMO` | não | `true` (padrão) trava a chave Pix em `12345678900` (demo pública); `false` libera a edição. |
| `CRON_SECRET` | não | Segredo (mín. 16 caracteres) que a Vercel Cron envia em `Authorization: Bearer`. Ativa `GET /cron/limpar-pedidos`, que apaga todos os pedidos (agendado em `vercel.json`, 03:00 UTC). Sem ele a rota responde 503. |
| `DATABASE_TESTS_URL` | só nos testes | Banco **separado** usado por `npm test`. |

> Neon: para migrations use a string **direta** (sem `-pooler`). Para a API rodando na Vercel (serverless) a string **com** `-pooler` é a mais indicada.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe a API com recarga automática. |
| `npm run build` / `npm start` | Gera o cliente do Prisma, compila para `dist/` e roda o build. |
| `npm run typecheck` | Confere os tipos (sem gerar arquivos). |
| `npm test` / `npm run test:watch` | Testes automatizados (Vitest). |
| `npm run db:deploy` | Aplica as migrations que ainda não rodaram no banco. **É o comando para clonar o projeto e para produção.** |
| `npm run db:migrate` | `prisma migrate dev`: cria uma **nova** migration a partir de mudanças no `schema.prisma` (só em desenvolvimento). |
| `npm run db:generate` | Regenera o cliente do Prisma (`src/generated`, fora do git). |
| `npm run db:seed` | Cria/atualiza sabores, preços, configuração e o admin. Preserva o que o admin já editou; a senha do admin é sempre atualizada com o `.env`. |

## Estrutura

```
api/
├── prisma/            schema.prisma, migrations/ e seed.ts
├── src/
│   ├── index.ts       entrada da Vercel: exporta o handler serverless (default)
│   ├── server.ts      entrada local (npm run dev / npm start): faz o listen
│   ├── buildApp.ts    monta o Fastify (CORS, rate limit, JWT, rotas)
│   ├── routes/        rotas públicas, auth e admin/
│   ├── schemas/       validação de entrada/saída (Zod)
│   ├── services/      regras de negócio (preço, pedidos, prazo do Pix, catálogo)
│   ├── plugins/       autenticação e tratamento de erros
│   └── lib/           env, prisma, códigos de pedido, validação de chave Pix
└── tests/             testes (Vitest)
```

## Testes automatizados

```bash
npm test
```

- Usam o banco de `DATABASE_TESTS_URL` e **se recusam a rodar** se ele for igual ao `DATABASE_URL`.
- A cada execução o banco de testes recebe as migrations e volta aos dados base, com um admin próprio (`admin_teste`).
- Regras puras (preço, prazo do Pix, validações) não usam o banco; as rotas são chamadas em memória com `app.inject`.
- No GitHub, o workflow `.github/workflows/api-tests.yml` roda typecheck + testes a cada push/PR que mexa em `api/` (precisa do secret `DATABASE_TESTS_URL`, criado em *Settings → Secrets and variables → Actions* do repositório, com a string de um banco de testes separado).

## Deploy (Vercel)

A API roda na Vercel como função serverless, **sem `vercel.json`** (a Vercel usa `src/index.ts`, que exporta o handler). Resumo:

1. Crie um projeto na Vercel apontando para este repositório com **Root Directory = `api`**.
2. Configure `DATABASE_URL`, `JWT_SECRET` e `WEB_URL` (URL do front em produção).
3. Aplique as migrations e o seed no banco de produção (a Vercel não faz isso):
   ```bash
   # bash
   DATABASE_URL="<string direta do Neon>" npm run db:deploy
   DATABASE_URL="<string direta do Neon>" ADMIN_USER="<usuario>" ADMIN_PASSWORD="<senha forte>" npm run db:seed
   ```
   ```powershell
   # PowerShell
   $env:DATABASE_URL="<string direta do Neon>"; npm run db:deploy
   $env:ADMIN_USER="<usuario>"; $env:ADMIN_PASSWORD="<senha forte>"; npm run db:seed
   ```
4. Teste `GET <url-da-api>/health`.

Observações de produção:
- O rate limit (`/pedido`: 10/min, `/auth/login`: 5/min) fica na memória de cada instância; em serverless ele é aproximado.
- O CORS aceita **uma** origem (`WEB_URL`). URLs de preview da Vercel (outro domínio) não funcionam com a API de produção.
- Sempre aplique a migration **antes** de publicar um código que dependa dela.

## Rotas

| Método | Rota | Acesso |
|---|---|---|
| GET | `/health` | público |
| GET | `/sabores`, `/valores`, `/tempo-preparo`, `/taxa-entrega`, `/pix`, `/funcionamento`, `/marca` | público |
| GET | `/marca/logo` (imagem PNG/SVG da logo; `?modo=escuro` para a do modo escuro; 404 se não houver) | público |
| POST | `/pedido` (limite: 10/min) | público |
| GET | `/pedido/:codigo` | público |
| POST | `/auth/login` (limite: 5/min) | público |
| GET | `/pedidos`, `/admin/sabores` | admin |
| PUT | `/pedido/:codigo/status`, `/pedido/:codigo/tempo-preparo` | admin |
| PUT | `/tempo-preparo`, `/taxa-entrega`, `/pix`, `/valores`, `/funcionamento` | admin |
| PUT | `/marca` (nome e cores), `/marca/logo` (logo em base64; `modo`: `claro` ou `escuro`) | admin |
| DELETE | `/pedido/:codigo` (exclusão definitiva), `/marca/logo` (`?modo=escuro` remove só a logo do modo escuro) | admin |
| POST | `/sabores` | admin |
| PATCH | `/sabores/:id` | admin |

Rotas de admin exigem `Authorization: Bearer <token>` (token do `POST /auth/login`, válido por 12 h). Erros de validação voltam como `400` com `{ "mensagem": "Dados inválidos.", "erros": [{ "campo", "mensagem" }] }`.

---

## Guia de testes manuais (Postman)

Roteiro para testar a API à mão no Postman. As regras de negócio completas estão em `APP.md`.

### Configurar o Postman

Crie um **Environment** "delivery-local" com:

| Variável | Valor inicial |
|---|---|
| `baseUrl` | `http://localhost:3333` |
| `token` | *(vazio, preenchido pelo login)* |
| `codigo` | *(vazio, preenchido ao criar pedido)* |

Nas requisições use `{{baseUrl}}/...`. Nas rotas do admin, aba **Authorization → Bearer Token → `{{token}}`**.

**Scripts úteis (aba Scripts/Tests):**

No `POST /auth/login`:
```js
pm.environment.set("token", pm.response.json().token);
```

No `POST /pedido`:
```js
pm.environment.set("codigo", pm.response.json().codigo);
```


### Testes manuais sugeridos

#### 4.1 Catálogo (público, sem token)

| # | Requisição | Esperado |
|---|---|---|
| 1 | `GET /health` | 200 `{ "status": "ok" }` |
| 2 | `GET /sabores` | 200, 8 sabores ativos (`id`, `nome`) |
| 3 | `GET /valores` | 200, faixas de 10 a 100 (R$ 13,00 … R$ 64,00), `acimaDe` com `0.64`, mínimo 10, máximo 1000, passo 10 |
| 4 | `GET /tempo-preparo` | 200 `{ minimoMin: 30, maximoMin: 60 }` (valores iniciais) |
| 5 | `GET /taxa-entrega` | 200 `taxaAte49: "7.00"`, `taxaDe50a199: "5.00"`, `entregaGratisAPartirDe: 200` |
| 6 | `GET /pix` | 200 com `configurada: false` enquanto a chave for o marcador `00000000000` |
| 6a | `GET /funcionamento` | 200 `aberto: true`, `estabelecimentoFechado: false`, `entregaHoje: true`, horários `null` (sem restrição) |

#### 4.2 Criar pedido — caminhos felizes

Body base:
```json
{
  "nomeCliente": "Maria Silva",
  "telefone": "(11) 91234-5678",
  "quantidade": 50,
  "tipoEntrega": "ENTREGA",
  "endereco": "Rua das Flores, 123",
  "formaPagamento": "PIX"
}
```

| # | Cenário | Ajuste no body | Esperado |
|---|---|---|---|
| 7 | Pedido misto, entrega | body base | 201, `status: AGUARDANDO_PAGAMENTO` (Pix; nas demais formas, `AGUARDANDO`), `subtotal 39.00`, `taxaEntrega 5.00`, `total 44.00`, `itens: [{ sabor: "Misto", quantidade: 50 }]`, `codigo` com 8 caracteres |
| 8 | Com sabores | `"sabores": [{"saborId":1,"quantidade":20},{"saborId":4,"quantidade":30}]` | 201, dois itens com o nome do sabor |
| 9 | Retirada | `"tipoEntrega":"RETIRADA"`, remover `endereco`, `"horarioAgendado":"<data futura ISO, ex.: 2026-12-01T15:00:00-03:00>"`, `quantidade: 10` | 201, `total 13.00`, `taxaEntrega 0.00` |
| 10 | Entrega até 49 un. | `quantidade: 10` | `subtotal 13.00` + `taxa 7.00` = `20.00` |
| 11 | Acima de 100 un. | retirada, `quantidade: 110` | `total 70.40` (110 × 0,64) |
| 12 | Faixa 50–199 | entrega, `quantidade: 190` | `total 126.60` (121,60 + 5,00) |
| 13 | Entrega grátis | entrega, `quantidade: 200` | `taxaEntrega 0.00`, `total 128.00` |
| 14 | Limite máximo | retirada, `quantidade: 1000` | 201 |
| 15 | Preço enviado pelo cliente é ignorado | adicionar `"total": 1` | 201 com total calculado pelo servidor |
| 16 | Formas de pagamento | trocar por `DINHEIRO` e `CARTAO` | 201 nos dois |
| 17 | Telefone sem máscara | `"telefone":"11912345678"` | 201 (só dígitos são guardados) |

#### 4.3 Criar pedido — validações (todas devem dar 400)

| # | Cenário | Ajuste |
|---|---|---|
| 18 | Quantidade não múltipla de 10 | `quantidade: 15` |
| 19 | Quantidade abaixo do mínimo | `quantidade: 0` |
| 20 | Quantidade acima do máximo | `quantidade: 1010` |
| 21 | Quantidade decimal | `quantidade: 10.5` |
| 22 | Entrega sem endereço | remover `endereco` |
| 23 | Endereço curto | `endereco: "Rua"` |
| 24 | Retirada ou entrega sem horário | omitir `horarioAgendado` | 201 (vale "para quando ficar pronto": `horarioAgendado: null`) |
| 25 | Retirada com horário no passado | `horarioAgendado: "2020-01-01T10:00:00-03:00"` |
| 26 | Horário sem fuso | `horarioAgendado: "2026-12-01T15:00:00"` |
| 27 | Soma dos sabores diferente da quantidade | `quantidade: 50` com sabores somando 40 |
| 28 | Sabor repetido | mesmo `saborId` duas vezes |
| 29 | Sabor inexistente | `saborId: 9999` (mensagem de sabor indisponível) |
| 30 | Sabor desativado | desative um sabor (teste 4.8) e use o id dele |
| 31 | Nome muito curto / ausente | `nomeCliente: "A"` ou remover |
| 32 | Telefone inválido | `"telefone":"123"` |
| 33 | Forma de pagamento inválida | `"formaPagamento":"BOLETO"` |
| 34 | Tipo de entrega inválido | `"tipoEntrega":"DRONE"` |
| 35 | Body vazio / JSON malformado | `{}` e `{ quebrado` |

#### 4.4 Consultar pedido (público)

| # | Requisição | Esperado |
|---|---|---|
| 36 | `GET /pedido/{{codigo}}` | 200 com o pedido; **não** deve conter `telefone` |
| 37 | `GET /pedido/` + código em minúsculas | 200 (código é normalizado para maiúsculas) |
| 38 | `GET /pedido/ZZZZZZZZ` | 404 `Pedido não encontrado.` |
| 39 | `GET /pedido/ABC` | 400 (código precisa ter 8 caracteres) |

#### 4.5 Login do admin

| # | Requisição | Esperado |
|---|---|---|
| 40 | `POST /auth/login` com `ADMIN_USER`/`ADMIN_PASSWORD` do `.env` | 200 `{ token }` (válido por 12 h) |
| 41 | Senha errada | 401 `Usuário ou senha inválidos.` |
| 42 | Usuário inexistente | 401 com a mesma mensagem |
| 43 | Body sem `senha` | 400 |
| 44 | Enviar 6 logins errados em 1 minuto | do 6º em diante: **429** (rate limit). Aguarde 1 min para liberar |

#### 4.6 Proteção das rotas do admin

Repita sem token, com token inválido (`Bearer abc`) e com token adulterado (altere um caractere):

| # | Requisição | Esperado |
|---|---|---|
| 45 | `GET /pedidos`, `GET /admin/sabores` | 401 `Não autorizado.` |
| 46 | `PUT /tempo-preparo`, `/taxa-entrega`, `/pix`, `/valores`, `/funcionamento` | 401 |
| 47 | `POST /sabores`, `PATCH /sabores/1`, `PUT /pedido/{{codigo}}/status` | 401 |

#### 4.7 Pedidos no painel (admin, com token)

| # | Requisição | Esperado |
|---|---|---|
| 48 | `GET /pedidos` | 200, mais recentes primeiro, **com** `telefone` (máx. 200) |
| 49 | `GET /pedidos?status=AGUARDANDO` | só pedidos aguardando |
| 50 | `GET /pedidos?status=FOO` | 400 |
| 51 | `GET /pedidos?de=2026-10-31&ate=2026-10-31` | só pedidos do dia (horário de Brasília) |
| 52 | `GET /pedidos?de=31/10/2026` | 400 (use `AAAA-MM-DD`) |
| 53 | `GET /pedidos?de=2030-01-01` | 200 com lista vazia |

**Mudança de status** — `PUT /pedido/{{codigo}}/status` com `{ "status": "..." }`:

| # | Tipo do pedido | Status enviado | Esperado |
|---|---|---|---|
| 54 | Entrega | `EM_PRODUCAO` → `EM_ROTA_ENTREGA` → `FINALIZADO` | 200 em todos |
| 55 | Entrega | `PRONTO_RETIRADA` | 400 (etapa não existe para entrega) |
| 56 | Retirada | `EM_PRODUCAO` → `PRONTO_RETIRADA` → `FINALIZADO` | 200 em todos |
| 57 | Retirada | `EM_ROTA_ENTREGA` | 400 |
| 58 | Qualquer | voltar uma etapa (ex.: `FINALIZADO` → `EM_PRODUCAO`) | 200 (admin pode corrigir) |
| 59 | Qualquer | `"status": "CANCELADO"` | 400 |
| 60 | Código inexistente | `EM_PRODUCAO` | 404 |
| 61 | Conferir | `GET /pedido/{{codigo}}` | status atualizado, visível ao cliente |

#### 4.8 Sabores (admin)

| # | Requisição | Esperado |
|---|---|---|
| 62 | `GET /admin/sabores` | 200, todos com campo `ativo`, inclusive desativados |
| 63 | `POST /sabores` `{ "nome": "Empada de frango" }` | 201 `{ id, nome, ativo: true }` |
| 64 | Repetir o mesmo nome | erro de conflito (409) |
| 65 | `POST /sabores` `{ "nome": "A" }` | 400 (mín. 2 caracteres) |
| 66 | `PATCH /sabores/{id}` `{ "nome": "Empada de camarão" }` | 200, nome alterado |
| 67 | `PATCH /sabores/{id}` `{ "ativo": false }` | 200; some de `GET /sabores` e continua em `GET /admin/sabores` |
| 68 | `PATCH /sabores/{id}` `{ "ativo": true }` | volta a aparecer no público |
| 69 | `PATCH /sabores/{id}` `{}` | 400 (`Informe o nome e/ou o campo ativo.`) |
| 70 | `PATCH /sabores/9999` `{ "ativo": false }` | 404 |
| 71 | `PATCH /sabores/abc` | 400 |
| 72 | Pedido antigo com sabor desativado | `GET /pedido/{codigo}` continua mostrando o sabor |

#### 4.9 Configurações (admin)

**Tempo de preparo** — `PUT /tempo-preparo`

| # | Body | Esperado |
|---|---|---|
| 73 | `{ "minimoMin": 20, "maximoMin": 40 }` | 200; `GET /tempo-preparo` reflete |
| 74 | `{ "minimoMin": 60, "maximoMin": 30 }` | 400 (máximo menor que mínimo) |
| 75 | `{ "minimoMin": 0, "maximoMin": 10 }` e `{ "minimoMin": 10, "maximoMin": 2000 }` | 400 |
| 76 | `{ "minimoMin": 10.5, "maximoMin": 20 }` | 400 (inteiros) |

**Taxa de entrega** — `PUT /taxa-entrega`

| # | Body | Esperado |
|---|---|---|
| 77 | `{ "taxaAte49": 8, "taxaDe50a199": 6.5 }` | 200; criar pedido de entrega de 10 un. passa a cobrar 8,00 e de 50 un. 6,50 |
| 78 | `{ "taxaAte49": 7.123, "taxaDe50a199": 5 }` | 400 (máx. 2 casas decimais) |
| 79 | `{ "taxaAte49": -1, "taxaDe50a199": 5 }` | 400 |
| 80 | Restaurar `{ "taxaAte49": 7, "taxaDe50a199": 5 }` | 200 |

**Pix** — `PUT /pix`

| # | Body | Esperado |
|---|---|---|
| 81 | `{ "tipo": "CPF", "chave": "529.982.247-25" }` (CPF válido de teste) | 200, `configurada: true`, chave só com dígitos |
| 82 | `{ "tipo": "CPF", "chave": "111.111.111-11" }` | 400 (dígitos verificadores) |
| 83 | `{ "tipo": "CNPJ", "chave": "11.222.333/0001-81" }` | 200 (CNPJ válido) |
| 84 | `{ "tipo": "TELEFONE", "chave": "(11) 91234-5678" }` | 200; `chaveParaCopiar` começa com `+55` |
| 85 | `{ "tipo": "TELEFONE", "chave": "12345" }` | 400 |
| 86 | `{ "tipo": "ALEATORIA", "chave": "123e4567-e89b-12d3-a456-426614174000" }` | 200 |
| 87 | `{ "tipo": "ALEATORIA", "chave": "qualquer-coisa" }` | 400 |
| 88 | `GET /pix` (sem token) | reflete a última chave salva |

> Se não quiser deixar uma chave de teste, coloque a sua chave real no final.

**Valores** — `PUT /valores` (envie as 10 faixas de uma vez)

```json
{
  "faixas": [
    { "quantidade": 10, "valor": 14 },
    { "quantidade": 20, "valor": 21 },
    { "quantidade": 30, "valor": 30 },
    { "quantidade": 40, "valor": 36 },
    { "quantidade": 50, "valor": 40 },
    { "quantidade": 60, "valor": 45 },
    { "quantidade": 70, "valor": 50 },
    { "quantidade": 80, "valor": 56 },
    { "quantidade": 90, "valor": 60 },
    { "quantidade": 100, "valor": 65 }
  ],
  "valorUnidadeAcimaDe100": 0.65
}
```

| # | Cenário | Esperado |
|---|---|---|
| 89 | Body acima | 200; `GET /valores` e novos pedidos usam os novos preços |
| 90 | Faltando uma faixa (9 itens) | 400 (`Envie exatamente as faixas...`) |
| 91 | Faixa duplicada ou quantidade fora da lista (ex.: 15) | 400 |
| 92 | Valor `0` ou negativo | 400 |
| 93 | Valor com 3 casas decimais (`13.999`) | 400 |
| 94 | Restaurar os valores originais (13, 20, 29, 35, 39, 44, 49, 55, 59, 64 e `0.64`) | 200 |

#### 4.10 Fluxo completo (cenário de ponta a ponta)

1. `GET /pix` → anote `configurada`.
2. `POST /pedido` (misto, entrega) → guarda `codigo`.
3. `GET /pedido/{{codigo}}` → status `AGUARDANDO_PAGAMENTO` (pedido com Pix).
4. `POST /auth/login` → guarda `token`.
5. `GET /pedidos` → o pedido aparece no topo, com telefone.
6. `PUT /pedido/{{codigo}}/status` → `EM_PRODUCAO`, depois `EM_ROTA_ENTREGA`, depois `FINALIZADO`.
7. `GET /pedido/{{codigo}}` → status `FINALIZADO`.

#### 4.11 Pix, status e horário

| # | Cenário | Esperado |
|---|---|---|
| 100 | `POST /pedido` com `"formaPagamento":"PIX"` | 201, `status: AGUARDANDO_PAGAMENTO`, `instrucaoPix` presente |
| 101 | Pix sem `horarioAgendado` (ou para hoje) | `instrucaoPix.imediato: true` |
| 102 | Pix com `horarioAgendado` de um dia seguinte, 50 un. | `imediato: false`, `horasAntecedencia: 2`, `pagarAte` = horário − 2 h |
| 103 | Idem, 110 un. | `horasAntecedencia: 4` |
| 104 | `PUT /pedido/{{codigo}}/status` `PAGAMENTO_APROVADO` → `EM_PRODUCAO` | 200 (pedido Pix) |
| 105 | `PUT .../status` `AGUARDANDO` em pedido Pix, ou `PAGAMENTO_APROVADO` em pedido com dinheiro | 400 |
| 106 | `PUT /pedido/{{codigo}}/tempo-preparo` `{ "minutos": 40 }` em pedido **sem** horário | 200, `tempoPreparoMin: 40` e `previsaoEm` |
| 107 | O mesmo em pedido **com** `horarioAgendado` | 400 |
| 108 | `PUT /pix` com `titular`, `banco`, `whatsapp`, `antecedenciaAteLimiteHoras`, `antecedenciaAcimaLimiteHoras` | 200; `GET /pix` reflete |

#### 4.12 Funcionamento (horário, fechado e entrega do dia)

`PUT /funcionamento` (admin) recebe sempre o estado completo: `{ horarioAbertura, horarioFechamento, estabelecimentoFechado, entregaHoje }`. Os horários são `"HH:MM"` no horário de Brasília, ou `null` nos dois (sem horário definido).

| # | Cenário | Esperado |
|---|---|---|
| 109 | `PUT /funcionamento` `{ "horarioAbertura": "08:00", "horarioFechamento": "18:00", "estabelecimentoFechado": false, "entregaHoje": true }` | 200; `GET /funcionamento` (sem token) reflete e traz `aberto` conforme a hora atual |
| 110 | Só `horarioAbertura`, ou os dois iguais, ou `"8h"` / `"24:00"` | 400 |
| 111 | `estabelecimentoFechado: true` (mesmo dentro do horário) | `aberto: false`, `motivoFechado: "FECHADO_MANUAL"`; `POST /pedido` (agora ou agendado) retorna 400 `Estamos fechados...` |
| 112 | Voltar `estabelecimentoFechado: false` | `aberto` volta a seguir o horário |
| 113 | Horário que **não** cobre a hora atual | `motivoFechado: "FORA_DO_HORARIO"`; `POST /pedido` sem `horarioAgendado` retorna 400; com `horarioAgendado` dentro do atendimento, 201 |
| 114 | `horarioAgendado` fora do atendimento (ex.: 19:00 com atendimento 08:00–18:00) | 400 `O horário escolhido está fora do atendimento` |
| 115 | `entregaHoje: false` | `GET /funcionamento` com `entregaHoje: false` |
| 116 | Com `entregaHoje: false`: entrega sem `horarioAgendado`, ou agendada para hoje | 400 `Hoje estamos apenas com retirada...` / `Hoje não estamos fazendo entregas...` |
| 117 | Com `entregaHoje: false`: retirada, ou entrega agendada para outro dia | 201 |
| 118 | No dia seguinte, sem mexer em nada | `entregaHoje: true` de novo (a chave vale só para o dia em que foi desligada) |

> Ao terminar, volte tudo ao normal (`estabelecimentoFechado: false`, `entregaHoje: true`, horários `null`).

#### 4.13 Outros

| # | Cenário | Esperado |
|---|---|---|
| 95 | Rate limit do pedido: enviar 11 `POST /pedido` válidos em 1 minuto | o 11º retorna 429 |
| 96 | Rota inexistente `GET /nada` | 404 |
| 97 | CORS: requisição com header `Origin: http://localhost:5173` | resposta com `access-control-allow-origin: http://localhost:5173` |
| 98 | CORS: `Origin: http://site-malicioso.com` | sem o header `access-control-allow-origin` |
| 99 | Token expirado | 401 (difícil de testar manualmente: expira em 12 h) |

### Dicas

- **Dados de teste ficam no banco** (Neon, o mesmo do `DATABASE_URL`). Anote os códigos dos pedidos que criar, ou ignore-os na lista do painel.
- **Testes automatizados:** `npm test` usa um banco separado (`DATABASE_TESTS_URL`) e não mexe nos dados da API de desenvolvimento.
- **Collection Runner:** com os scripts da seção 2, dá para rodar o fluxo 4.10 em sequência.
- **429 inesperado?** O rate limit é por IP e por minuto; é só esperar.
