-- Bebida escolhida no pedido (nome e valor da hora do pedido)
ALTER TABLE "Pedido" ADD COLUMN "bebidaNome" VARCHAR(80);
ALTER TABLE "Pedido" ADD COLUMN "bebidaValor" DECIMAL(10,2);
