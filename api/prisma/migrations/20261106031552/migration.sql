-- CreateEnum
CREATE TYPE "TipoEntrega" AS ENUM ('ENTREGA', 'RETIRADA');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('DINHEIRO', 'CARTAO', 'PIX');

-- CreateEnum
CREATE TYPE "TipoChavePix" AS ENUM ('CPF', 'CNPJ', 'TELEFONE', 'ALEATORIA');

-- CreateEnum
CREATE TYPE "StatusPedido" AS ENUM ('AGUARDANDO_PAGAMENTO', 'PAGAMENTO_APROVADO', 'AGUARDANDO', 'EM_PRODUCAO', 'EM_ROTA_ENTREGA', 'PRONTO_RETIRADA', 'FINALIZADO');

-- CreateTable
CREATE TABLE "Sabor" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(80) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Sabor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaixaPreco" (
    "id" SERIAL NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "FaixaPreco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuracao" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "tempoPreparoMinimoMin" INTEGER NOT NULL DEFAULT 30,
    "tempoPreparoMaximoMin" INTEGER NOT NULL DEFAULT 60,
    "valorUnidadeAcimaDe100" DECIMAL(10,2) NOT NULL DEFAULT 0.64,
    "taxaEntregaAte49" DECIMAL(10,2) NOT NULL DEFAULT 7.00,
    "taxaEntregaDe50a199" DECIMAL(10,2) NOT NULL DEFAULT 5.00,
    "entregaGratisAPartirDe" INTEGER NOT NULL DEFAULT 200,
    "tipoChavePix" "TipoChavePix" NOT NULL DEFAULT 'CPF',
    "chavePix" VARCHAR(100) NOT NULL DEFAULT '00000000000',
    "titularPix" VARCHAR(80),
    "bancoPix" VARCHAR(80),
    "whatsappEstabelecimento" VARCHAR(20),
    "pixAntecedenciaAteLimiteHoras" INTEGER NOT NULL DEFAULT 2,
    "pixAntecedenciaAcimaLimiteHoras" INTEGER NOT NULL DEFAULT 4,
    "horarioAbertura" VARCHAR(5),
    "horarioFechamento" VARCHAR(5),
    "estabelecimentoFechado" BOOLEAN NOT NULL DEFAULT false,
    "diasAtendimento" INTEGER[] DEFAULT ARRAY[0, 1, 2, 3, 4, 5, 6]::INTEGER[],
    "enderecoRetirada" VARCHAR(300),
    "entregaSuspensaEm" VARCHAR(10),
    "nomeMarca" VARCHAR(60) NOT NULL DEFAULT 'DeliveryApp',
    "logoDados" BYTEA,
    "logoTipo" VARCHAR(30),
    "logoAtualizadaEm" TIMESTAMP(3),
    "logoEscuraDados" BYTEA,
    "logoEscuraTipo" VARCHAR(30),
    "logoEscuraAtualizadaEm" TIMESTAMP(3),
    "cores" JSONB,

    CONSTRAINT "Configuracao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(12) NOT NULL,
    "nomeCliente" VARCHAR(120) NOT NULL,
    "telefone" VARCHAR(20) NOT NULL,
    "tipoEntrega" "TipoEntrega" NOT NULL,
    "endereco" VARCHAR(300),
    "pontoReferencia" VARCHAR(200),
    "observacao" VARCHAR(500),
    "horarioAgendado" TIMESTAMP(3),
    "formaPagamento" "FormaPagamento" NOT NULL,
    "enderecoRetirada" VARCHAR(300),
    "precisaTroco" BOOLEAN NOT NULL DEFAULT false,
    "trocoPara" DECIMAL(10,2),
    "status" "StatusPedido" NOT NULL DEFAULT 'AGUARDANDO',
    "quantidadeTotal" INTEGER NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "taxaEntrega" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "tempoPreparoMin" INTEGER,
    "previsaoEm" TIMESTAMP(3),
    "pixAntecedenciaHoras" INTEGER,
    "pagarAte" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPedido" (
    "id" SERIAL NOT NULL,
    "pedidoId" UUID NOT NULL,
    "saborId" INTEGER,
    "quantidade" INTEGER,

    CONSTRAINT "ItemPedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" SERIAL NOT NULL,
    "usuario" VARCHAR(60) NOT NULL,
    "senhaHash" TEXT NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sabor_nome_key" ON "Sabor"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "FaixaPreco_quantidade_key" ON "FaixaPreco"("quantidade");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_codigo_key" ON "Pedido"("codigo");

-- CreateIndex
CREATE INDEX "Pedido_status_criadoEm_idx" ON "Pedido"("status", "criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_usuario_key" ON "AdminUser"("usuario");

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_saborId_fkey" FOREIGN KEY ("saborId") REFERENCES "Sabor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
