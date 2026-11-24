-- Várias bebidas por pedido: troca as colunas únicas por uma tabela de itens.
ALTER TABLE "Pedido" DROP COLUMN "bebidaNome";
ALTER TABLE "Pedido" DROP COLUMN "bebidaValor";

CREATE TABLE "ItemBebida" (
    "id" SERIAL NOT NULL,
    "pedidoId" UUID NOT NULL,
    "nome" VARCHAR(80) NOT NULL,
    "valorUnitario" DECIMAL(10,2) NOT NULL,
    "quantidade" INTEGER NOT NULL,

    CONSTRAINT "ItemBebida_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ItemBebida" ADD CONSTRAINT "ItemBebida_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;
