Vamos iniciar um projeto de delivery app, começaremos pela base do backend/api. O frontend vou enviar imagens para o app do Claude para gerar depois. Para o backend quero utilizar .net ou c#, pois quero conhecer mais sobre a linguagem. Abaixo está uma descrição do MVP.

## Requisitos iniciais do MVP:
O app não terá login para o cliente, pensei em salvar dados através do localhost ou algo assim, estilo anota.ai de delivery.
O pedido será feito através da plataforma, mas o pagamento deverá ser feito presencialmente apenas em caso de cartões e dinheiro, ou via pix com a chave para o cliente copiar e fazer manualmente.
Quando um pedido é feito e enviado, o usuário admin deverá receber dentro de um painel de administração.
Dentro do painel de admin, o usuário responsável irá informar o status do pedido (aguardando, em produção, em rota de entrega ou pronto para retirada, finalizado).
O tempo de preparo será definido pelo admin, onde ele pode definir o tempo mínimo e o tempo máximo para ser exibido.

## O app:
É um app para delivery de mini salgados, são 8 sabores e o cliente pode definir uma quantidade mista sem escolher quantas unidades de cada sabor, ou definir os sabores e a quantidade de cada um. Um exemplo:
Quero 50 unidades mista (aqui o cliente não escolheu os sabores, apenas a quantidade)
Quero 50 unidades sendo 10 bolinha de queijo, 10 pastel de carne, 10 coxinhas, 10 croquetes, 10 enroladinho de salsicha.

## Detalhes:
### Sabores
- Coxinha de frango
- Enroladinho de salsicha
- Croquete de queijo e presunto
- Bolinha de queijo
- Risóles de carne
- Kibe de carne
- Mini pastel de pizza
- Mini pastel de carne

### Valores
| Quantidade | Valor |
|------------|-------|
| 10 unidades | R$ 13,00 |
| 20 unidades | R$ 20,00 |
| 30 unidades | R$ 29,00 |
| 40 unidades | R$ 35,00 |
| 50 unidades | R$ 39,00 |
| 60 unidades | R$ 44,00 |
| 70 unidades | R$ 49,00 |
| 80 unidades | R$ 55,00 |
| 90 unidades | R$ 59,00 |
| 100 unidades | R$ 64,00 |
| Acima de 100 unidades | R$ 0,64 por unidade |

### Métodos de pagamento
- Dinheiro (pagamento presencial)
- Cartão de crédito/débito (pagamento presencial)
- Pix (pagamento online, chave CPF > o cliente copia a chave e faz o pagamento manualmente, o app não terá integração com o sistema de pagamenton, e o cliente envia o comprovante manualmente para o Whatsapp do estabelecimento)

### Entrega e Retirada
- O cliente poderá escolher entre entrega ou retirada no local.
- A entrega está disponível para qualquer quantidade, com taxa por faixa (valores editáveis pelo admin):
  - **Até 49 unidades: R$ 7,00.**
  - **De 50 a 199 unidades: R$ 5,00.**
  - **A partir de 200 unidades (200 ou mais): entrega gratuita.**
- Para retirada, o cliente poderá escolher um horário disponível para buscar o pedido.
- O app não terá integração com sistemas de entrega, o cliente será responsável por buscar o pedido ou aguardar a entrega feita pelo estabelecimento.
- A entrega pode ser desligada só para o dia vigente (ver "Funcionamento").

Esses são os primeiros passos da API do app de delivery. A partir daqui, podemos começar a estruturar o backend utilizando .NET/C#. Podemos criar os seguintes endpoints iniciais:

1. **GET /sabores**: Retorna a lista de sabores disponíveis.
2. **POST /pedido**: Recebe os detalhes do pedido (quantidade, sabores, método de pagamento, tipo de entrega) e salva no banco de dados.
3. **GET /pedido/{id}**: Retorna os detalhes de um pedido específico pelo ID.
4. **PUT /pedido/{id}/status**: Atualiza o status do pedido (aguardando, em produção, em rota de entrega, pronto para retirada, finalizado).
5. **GET /pedidos**: Retorna a lista de todos os pedidos feitos, com filtros opcionais por status e data.
6. **GET /tempo-preparo**: Retorna o tempo mínimo e máximo de preparo definido pelo admin.
7. **PUT /tempo-preparo**: Permite ao admin definir o tempo mínimo e máximo de preparo.
8. **GET /taxa-entrega**: Retorna a taxa de entrega atual e as condições para entrega gratuita.
9. **PUT ou PATCH /editar-sabores**: Permite ao admin adicionar, remover ou editar os sabores disponíveis.
10. **GET /valores**: Retorna a tabela de valores para diferentes quantidades de unidades.
11. **PUT /valores**: Permite ao admin atualizar os valores para diferentes quantidades de unidades.

## Regras de negócio consolidadas (referência)
O preço é sempre calculado no servidor; o valor enviado pelo cliente é ignorado.

| Regra | Valor |
|---|---|
| Quantidade do pedido | Múltiplo de 10, de 10 a 1000 unidades |
| Preço de 10 a 100 unidades | Tabela de valores (faixas) |
| Preço acima de 100 unidades | R$ 0,64 por unidade |
| Taxa de entrega até 49 unidades | R$ 7,00 (editável: `PUT /taxa-entrega`) |
| Taxa de entrega de 50 a 199 unidades | R$ 5,00 (editável: `PUT /taxa-entrega`) |
| Entrega gratuita | A partir de 200 unidades (200 ou mais) |
| Retirada | Sem taxa |
| Horário (entrega e retirada) | `horarioAgendado` opcional (data e hora com fuso, no futuro). Ausente = "para quando ficar pronto": o admin informa o tempo de preparo do pedido em `PUT /pedido/{codigo}/tempo-preparo` `{ minutos }` e a resposta traz `tempoPreparoMin` e `previsaoEm` |
| Sabores | Três formas de enviar `sabores`: (1) vazio = pedido misto (na resposta vem um único item `{ sabor: "Misto", quantidade }`, no banco `saborId` nulo); (2) cada sabor com `quantidade`: a soma deve ser exatamente a quantidade do pedido; (3) só os sabores, **sem** `quantidade`: a loja divide as unidades e cada item vem com `quantidade: null`. Misturar itens com e sem quantidade é recusado (400). Sabor repetido é recusado |
| Endereço de entrega | Obrigatórios na entrega: `endereco` (rua ou avenida, 5 a 300 caracteres), `numero` (até 20, aceita "S/N") e `bairro` (até 100). Texto em branco conta como não informado. Na retirada são ignorados. Pedidos antigos podem ter número e bairro dentro de `endereco` |
| Ponto de referência | `pontoReferencia` opcional (até 200 caracteres), só vale na entrega; vazio é tratado como não informado |
| Código do pedido | 8 caracteres (sem I, L, O, 0, 1), usado pelo cliente para consultar `GET /pedido/{codigo}` |

Exemplos: 10 retirada = R$ 13,00 · 10 entrega = R$ 20,00 · 50 entrega = R$ 44,00 · 110 retirada = R$ 70,40 · 190 entrega = R$ 126,60 · 200 entrega = R$ 128,00 (sem taxa).

## Pix
- `GET /pix` (público) devolve `{ tipo, chave, chaveParaCopiar, configurada }`. O front mostra `chaveParaCopiar` (telefone leva `+55`) e deve esconder a opção de Pix enquanto `configurada` for `false`.
- Valor inicial: tipo CPF e chave `00000000000`, que não é um CPF válido de propósito: é o marcador de "ainda não configurada". O admin define a chave real em `PUT /pix`.
- O app não confirma pagamento: o cliente copia a chave, paga manualmente e envia o comprovante pelo WhatsApp do estabelecimento.
- **O pedido com Pix só é iniciado depois do comprovante e da confirmação do pagamento.** Ele fica em `AGUARDANDO_PAGAMENTO` até o admin conferir o comprovante e mudar para `PAGAMENTO_APROVADO`; só então segue para `EM_PRODUCAO`. O cliente é avisado disso na página de pedido (ao escolher Pix) e no acompanhamento.

## Funcionamento (horário, fechado e entrega do dia)
Tudo no horário de Brasília. `GET /funcionamento` (público) devolve `{ horarioAbertura, horarioFechamento, estabelecimentoFechado, aberto, motivoFechado, entregaHoje }`; o admin altera com `PUT /funcionamento`.
- **Horário de atendimento:** um intervalo diário (`"HH:MM"`), igual todos os dias. Os dois campos `null` = sem horário definido, sem restrição. A abertura vale e o fechamento não (às 18:00 em ponto já fechou). Se o fechamento for menor que a abertura (18:00 às 02:00), o atendimento passa da meia-noite.
- **Estabelecimento fechado:** chave do admin que fecha de vez, independente do horário, até ser desligada. Fechado manualmente, **nenhum pedido** é aceito, nem os agendados.
- **Fora do horário** (sem a chave ligada): `POST /pedido` sem `horarioAgendado` ("assim que ficar pronto") é recusado; o cliente pode **agendar** para um horário dentro do atendimento. Com horário definido, todo `horarioAgendado` precisa cair dentro dele.
- **Entrega do dia:** o admin desliga a entrega só para hoje (`entregaHoje: false`). Guardamos o dia (`entregaSuspensaEm`), então a chave volta a ligar sozinha à meia-noite. Hoje só retirada: entrega "assim que ficar pronto" ou agendada para hoje é recusada; entrega agendada para outro dia é aceita.
- Os bloqueios respondem 400 com mensagem em português. O front espelha as regras só para avisar antes de enviar; a decisão é sempre da API.

## Testes
`npm test` (Vitest). Usa um banco separado (`DATABASE_TESTS_URL`, por exemplo uma branch do Neon) e recusa rodar se ele for igual ao `DATABASE_URL`. A cada execução o banco de testes recebe as migrations e volta aos dados base, com um admin próprio (`admin_teste`). Regras puras (preço, validação do pedido, chave Pix) não usam o banco; as rotas são chamadas em memória com `app.inject`.

## Acesso do admin
- `POST /auth/login` (usuário e senha) devolve um token JWT válido por 12 horas, enviado no header `Authorization: Bearer <token>`.
- Todas as rotas do admin exigem o token (o plugin `routes/admin` aplica a verificação a todas as rotas dentro dele):

| Rota | Função |
|---|---|
| `GET /pedidos?status=&de=&ate=` | Lista pedidos (com telefone), mais recentes primeiro |
| `PUT /pedido/{codigo}/status` | Muda o status. Entrega: aguardando, em produção, em rota de entrega, finalizado. Retirada: aguardando, em produção, pronto para retirada, finalizado. O admin pode voltar uma etapa |
| `PUT /marca` | `{ nome, cores }`. `cores` é `null` (tema padrão) ou `{ publico|admin: { claro|escuro: { fundo, texto, cartao, primaria, destaque, textoSecundario, borda, barraLateral (só admin) } } }`, cada uma em `#RRGGBB` (todas opcionais) |
| `PUT /marca/logo` | `{ modo?: "claro" | "escuro", tipo: "image/png" | "image/svg+xml", dados: <base64> }`, até 300 KB (`modo` ausente = "claro"). A logo do modo escuro é opcional: sem ela, o front usa a logo normal no modo escuro. `GET /marca` devolve `logoVersao` e `logoEscuraVersao`. A API confere o conteúdo real (assinatura do PNG; SVG sem scripts, eventos ou elementos externos). A logo fica no banco e é servida em `GET /marca/logo?v=<logoVersao>` (modo escuro: `GET /marca/logo?modo=escuro&v=<logoEscuraVersao>`) com cabeçalhos que impedem execução de conteúdo ativo |
| `DELETE /marca/logo` | Remove a logo normal; com `?modo=escuro`, remove só a logo do modo escuro |
| `DELETE /pedido/{codigo}` | Exclui o pedido e seus itens de forma definitiva (204). Não há como desfazer |
| `PUT /tempo-preparo` | `{ minimoMin, maximoMin }` |
| `PUT /taxa-entrega` | `{ taxaAte49, taxaDe50a199 }` (em reais, até 2 casas) |
| `PUT /funcionamento` | `{ horarioAbertura, horarioFechamento, estabelecimentoFechado, entregaHoje }`, sempre o estado completo. Horários `"HH:MM"` ou `null` nos dois |
| `PUT /pix` | `{ tipo: CPF \| CNPJ \| TELEFONE \| ALEATORIA, chave }`. CPF e CNPJ são validados pelos dígitos verificadores, o telefone exige DDD e a chave aleatória deve ser um UUID |
| `PUT /valores` | Tabela completa (10 a 100) mais `valorUnidadeAcimaDe100` |
| `GET /admin/sabores` | Todos os sabores, inclusive desativados |
| `POST /sabores` | Cria sabor (nome único) |
| `PATCH /sabores/{id}` | Edita nome e/ou ativa/desativa. Sabores não são apagados, porque pedidos antigos os referenciam |
- O admin inicial é criado pelo seed a partir de `ADMIN_USER` e `ADMIN_PASSWORD` do `.env`.

## Pagamento via Pix: status e prazos
- **Status do pedido com Pix:** `AGUARDANDO_PAGAMENTO` (inicial) → `PAGAMENTO_APROVADO` (o admin confirma após receber o comprovante) → `EM_PRODUCAO` → `EM_ROTA_ENTREGA` ou `PRONTO_RETIRADA` → `FINALIZADO`. Pedidos com dinheiro ou cartão seguem `AGUARDANDO` → `EM_PRODUCAO` → ... como antes. O admin pode voltar uma etapa.
- **Quando pagar (`instrucaoPix` na resposta do pedido):**
  - pedido para hoje (dia de Brasília) ou sem horário ("para quando ficar pronto"): pagar no ato do pedido (`imediato: true`);
  - pedido agendado para um dia seguinte: pagar com antecedência mínima em relação ao `horarioAgendado`: **2 horas até 100 unidades; 4 horas acima de 100** (`horasAntecedencia`, `pagarAte`). Se o limite já passou, vale "pagar agora". O prazo é gravado no pedido: mudar a configuração depois não altera pedidos antigos.
- **Dados do Pix e contato (admin, `PUT /pix`):** `{ tipo, chave, titular?, banco?, whatsapp?, antecedenciaAteLimiteHoras?, antecedenciaAcimaLimiteHoras? }`. Campos ausentes não mudam; texto vazio apaga. `GET /pix` (público) devolve também `titular`, `banco`, `whatsapp` (DDD + número) e `antecedencia: { ateLimiteHoras, acimaLimiteHoras, limiteUnidades }`.