-- Base de endereço estruturado e identificadores pessoais.
-- A migração é aditiva: Tenant.address e Property.street/zip/city são preservados.

CREATE TYPE "PersonIdentifierType" AS ENUM ('CPF', 'CNPJ', 'CIN', 'RG', 'IE', 'CAEPF', 'FOREIGN');
CREATE TYPE "IdentifierValidationStatus" AS ENUM ('UNVERIFIED', 'VALID', 'INVALID');

CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "district" TEXT,
    "locality" TEXT,
    "administrativeArea" TEXT,
    "postalCode" TEXT,
    "postalCodeNormalized" TEXT,
    "countryCode" CHAR(2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PersonIdentifier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "type" "PersonIdentifierType" NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "valueNormalized" TEXT NOT NULL,
    "valueDisplay" TEXT NOT NULL,
    "issuer" TEXT,
    "issuedIn" TEXT,
    "issuedAt" TIMESTAMP(3),
    "validationStatus" "IdentifierValidationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "basisIdentifierId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonIdentifier_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Tenant" ADD COLUMN "addressId" TEXT;
ALTER TABLE "Property" ADD COLUMN "addressId" TEXT;
ALTER TABLE "Person" ADD COLUMN "addressId" TEXT;

-- Backfill dos imóveis sem transformar silenciosamente os campos originais.
INSERT INTO "Address" (
    "id", "tenantId", "line1", "locality", "postalCode", "postalCodeNormalized",
    "countryCode", "createdAt", "updatedAt"
)
SELECT
    'legacy-property-address-' || p."id", p."tenantId", p."street", p."city", p."zip", p."zip",
    'DE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Property" p;

UPDATE "Property"
SET "addressId" = 'legacy-property-address-' || "id";

-- Tenant.address é texto livre legado; mantemos o texto e o representamos em line1.
INSERT INTO "Address" (
    "id", "tenantId", "line1", "countryCode", "createdAt", "updatedAt"
)
SELECT
    'legacy-tenant-address-' || t."id", t."id", t."address", 'DE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Tenant" t
WHERE t."address" IS NOT NULL AND btrim(t."address") <> '';

UPDATE "Tenant"
SET "addressId" = 'legacy-tenant-address-' || "id"
WHERE "address" IS NOT NULL AND btrim("address") <> '';

CREATE UNIQUE INDEX "Tenant_addressId_key" ON "Tenant"("addressId");
CREATE UNIQUE INDEX "Property_addressId_key" ON "Property"("addressId");
CREATE UNIQUE INDEX "Person_addressId_key" ON "Person"("addressId");
CREATE INDEX "Address_tenantId_idx" ON "Address"("tenantId");
CREATE INDEX "Address_tenantId_countryCode_idx" ON "Address"("tenantId", "countryCode");
CREATE INDEX "Address_tenantId_postalCodeNormalized_idx" ON "Address"("tenantId", "postalCodeNormalized");
CREATE UNIQUE INDEX "PersonIdentifier_tenantId_type_countryCode_valueNormalized_key"
    ON "PersonIdentifier"("tenantId", "type", "countryCode", "valueNormalized");
CREATE INDEX "PersonIdentifier_tenantId_personId_idx" ON "PersonIdentifier"("tenantId", "personId");

ALTER TABLE "Address" ADD CONSTRAINT "Address_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_addressId_fkey"
    FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Property" ADD CONSTRAINT "Property_addressId_fkey"
    FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Person" ADD CONSTRAINT "Person_addressId_fkey"
    FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PersonIdentifier" ADD CONSTRAINT "PersonIdentifier_personId_fkey"
    FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonIdentifier" ADD CONSTRAINT "PersonIdentifier_basisIdentifierId_fkey"
    FOREIGN KEY ("basisIdentifierId") REFERENCES "PersonIdentifier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
