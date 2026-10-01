import { describe, expect, it } from "vitest";
import { LEGACY_MARKET_PROFILE, MARKET_PROFILE_IDS, MARKET_PROFILES, isMarketProfileId, marketProfile } from "./market-profile";

describe("market profiles", () => {
  it("keeps the legacy German defaults explicit", () => {
    expect(LEGACY_MARKET_PROFILE).toBe("DE");
    expect(marketProfile("DE")).toMatchObject({
      countryCode: "DE",
      defaultLocale: "de",
      defaultTimeZone: "Europe/Berlin",
      defaultCurrency: "EUR",
    });
  });

  it("defines the Brazilian operational defaults without changing user locale", () => {
    expect(marketProfile("BR")).toMatchObject({
      countryCode: "BR",
      defaultLocale: "pt-BR",
      defaultTimeZone: "America/Sao_Paulo",
      defaultCurrency: "BRL",
    });
  });

  it("has only the approved profiles", () => {
    expect(MARKET_PROFILE_IDS).toEqual(["DE", "BR"]);
    expect(Object.keys(MARKET_PROFILES)).toEqual(["DE", "BR"]);
    expect(isMarketProfileId("BR")).toBe(true);
    expect(isMarketProfileId("US")).toBe(false);
  });
});
