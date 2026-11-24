-- AlterTable
ALTER TABLE "Configuracao" ADD COLUMN "vendaBebidasAtiva" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Bebida" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(80) NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "fotoDados" BYTEA,
    "fotoTipo" VARCHAR(30),
    "fotoAtualizadaEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bebida_pkey" PRIMARY KEY ("id")
);
