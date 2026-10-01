import { isMarketProfileId, LEGACY_MARKET_PROFILE, marketProfile, type MarketProfileId } from "./market-profile";

export type TenantPresentationFields = {
  marketProfile: string | null | undefined;
  marketProfileVersion: number | null | undefined;
  timeZone: string | null | undefined;
  currencyCode: string | null | undefined;
  dateFormat: string | null | undefined;
};

export type PresentationContext = Readonly<{
  marketProfile: MarketProfileId;
  marketProfileVersion: number;
  locale: string;
  dateFormat: string;
  timeZone: string;
  currencyCode: string;
}>;

/** Resolves presentation defaults without coupling market rules to UI locale. */
export function resolvePresentationContext(
  tenant: TenantPresentationFields,
  userLocale: string | null | undefined,
): PresentationContext {
  const requestedProfile = tenant.marketProfile ?? "";
  const profileId: MarketProfileId = isMarketProfileId(requestedProfile)
    ? requestedProfile
    : LEGACY_MARKET_PROFILE;
  const profile = marketProfile(profileId);
  const locale = userLocale || profile.defaultLocale;

  return {
    marketProfile: profileId,
    marketProfileVersion: tenant.marketProfileVersion || profile.version,
    locale,
    dateFormat: tenant.dateFormat || locale,
    timeZone: tenant.timeZone || profile.defaultTimeZone,
    currencyCode: tenant.currencyCode || profile.defaultCurrency,
  };
}
