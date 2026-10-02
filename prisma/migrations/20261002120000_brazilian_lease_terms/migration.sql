-- Dados informativos de locação residencial urbana para o perfil BR.
-- Não altera contratos existentes nem tabelas financeiras.
CREATE TYPE "BrazilianLeasePurpose" AS ENUM ('RESIDENTIAL_URBAN');
CREATE TYPE "BrazilianGuaranteeType" AS ENUM ('CAUCAO', 'FIANCA', 'SEGURO_FIANCA', 'FIDUCIARY_FUND_QUOTAS');

CREATE TABLE "BrazilianLeaseTerms" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "contractReference" TEXT,
    "purpose" "BrazilianLeasePurpose" NOT NULL DEFAULT 'RESIDENTIAL_URBAN',
    "dueDay" INTEGER NOT NULL,
    "guaranteeType" "BrazilianGuaranteeType",
    "guarantorId" TEXT,
    "guaranteeNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrazilianLeaseTerms_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BrazilianLeaseTerms_leaseId_key" ON "BrazilianLeaseTerms"("leaseId");
CREATE INDEX "BrazilianLeaseTerms_tenantId_idx" ON "BrazilianLeaseTerms"("tenantId");
CREATE INDEX "BrazilianLeaseTerms_guarantorId_idx" ON "BrazilianLeaseTerms"("guarantorId");

ALTER TABLE "BrazilianLeaseTerms" ADD CONSTRAINT "BrazilianLeaseTerms_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrazilianLeaseTerms" ADD CONSTRAINT "BrazilianLeaseTerms_guarantorId_fkey" FOREIGN KEY ("guarantorId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
