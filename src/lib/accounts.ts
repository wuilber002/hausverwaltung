import type { PrismaClient } from "@prisma/client";

export const ACCOUNT_LOCALES = ["de", "en", "pt-BR"] as const;
type AccountLocale = (typeof ACCOUNT_LOCALES)[number];

const DEFAULT_ACCOUNTS: Record<AccountLocale, readonly { name: string; type: "BANK" | "KAUTION" | "RUECKLAGE" | "SACHKONTO" }[]> = {
  de: [
    { name: "Girokonto", type: "BANK" },
    { name: "Kautionskonto", type: "KAUTION" },
    { name: "Instandhaltungsrücklage", type: "RUECKLAGE" },
    { name: "Mieteinnahmen", type: "SACHKONTO" },
    { name: "Betriebskosten", type: "SACHKONTO" },
    { name: "Instandhaltung", type: "SACHKONTO" },
    { name: "Verwaltungskosten", type: "SACHKONTO" },
  ],
  en: [
    { name: "Checking account", type: "BANK" },
    { name: "Deposit account", type: "KAUTION" },
    { name: "Maintenance reserve", type: "RUECKLAGE" },
    { name: "Rental income", type: "SACHKONTO" },
    { name: "Operating costs", type: "SACHKONTO" },
    { name: "Maintenance", type: "SACHKONTO" },
    { name: "Management costs", type: "SACHKONTO" },
  ],
  "pt-BR": [
    { name: "Conta corrente", type: "BANK" },
    { name: "Conta de caução", type: "KAUTION" },
    { name: "Fundo de reserva", type: "RUECKLAGE" },
    { name: "Receitas de aluguel", type: "SACHKONTO" },
    { name: "Despesas operacionais", type: "SACHKONTO" },
    { name: "Manutenção", type: "SACHKONTO" },
    { name: "Despesas administrativas", type: "SACHKONTO" },
  ],
};

type AccountClient = Pick<PrismaClient, "account">;

function isAccountLocale(locale: string): locale is AccountLocale {
  return (ACCOUNT_LOCALES as readonly string[]).includes(locale);
}

export function defaultAccounts(locale: string) {
  return DEFAULT_ACCOUNTS[isAccountLocale(locale) ? locale : "de"];
}

/**
 * Erstellt den Standard-Kontenrahmen in der gewählten Sprache, nur wenn der
 * Mandant noch keine Konten besitzt. Bestehende Konten werden nie geändert.
 */
export async function ensureDefaultAccounts(db: AccountClient, tenantId: string, locale = "de"): Promise<number> {
  const count = await db.account.count({ where: { tenantId } });
  if (count > 0) return 0;
  const accounts = defaultAccounts(locale);
  await db.account.createMany({
    data: accounts.map((account) => ({ ...account, tenantId })),
  });
  return accounts.length;
}
