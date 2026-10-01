/**
 * Central contract for market profiles.
 *
 * The market profile belongs to an organization and does not replace the user
 * locale. This foundation changes no calculations, documents, or integrations;
 * it only makes defaults explicit and versioned.
 */
export const MARKET_PROFILE_IDS = ["DE", "BR"] as const;

export type MarketProfileId = (typeof MARKET_PROFILE_IDS)[number];

export type MarketProfileDefinition = Readonly<{
  id: MarketProfileId;
  version: 1;
  countryCode: "DE" | "BR";
  defaultLocale: "de" | "pt-BR";
  defaultTimeZone: "Europe/Berlin" | "America/Sao_Paulo";
  defaultCurrency: "EUR" | "BRL";
}>;

export const MARKET_PROFILES: Readonly<Record<MarketProfileId, MarketProfileDefinition>> = {
  DE: {
    id: "DE",
    version: 1,
    countryCode: "DE",
    defaultLocale: "de",
    defaultTimeZone: "Europe/Berlin",
    defaultCurrency: "EUR",
  },
  BR: {
    id: "BR",
    version: 1,
    countryCode: "BR",
    defaultLocale: "pt-BR",
    defaultTimeZone: "America/Sao_Paulo",
    defaultCurrency: "BRL",
  },
};

export const LEGACY_MARKET_PROFILE: MarketProfileId = "DE";

export function isMarketProfileId(value: string): value is MarketProfileId {
  return (MARKET_PROFILE_IDS as readonly string[]).includes(value);
}

export function marketProfile(value: MarketProfileId): MarketProfileDefinition {
  return MARKET_PROFILES[value];
}
