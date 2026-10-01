-- Market profile foundation. Existing tenants retain historic German defaults.
CREATE TYPE "MarketProfile" AS ENUM ('DE', 'BR');

ALTER TABLE "Tenant"
  ADD COLUMN "marketProfile" "MarketProfile" NOT NULL DEFAULT 'DE',
  ADD COLUMN "marketProfileVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "timeZone" TEXT NOT NULL DEFAULT 'Europe/Berlin',
  ADD COLUMN "currencyCode" TEXT NOT NULL DEFAULT 'EUR';
