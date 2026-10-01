import { describe, expect, it } from "vitest";
import { formatAddress, normalizeAddress } from "./address";

describe("structured addresses", () => {
  it("keeps Brazilian CEP display input while indexing its digits", () => {
    expect(normalizeAddress({ line1: "Rua das Flores, 100", locality: "São Paulo", postalCode: "01001-000", countryCode: "br" })).toMatchObject({
      countryCode: "BR", postalCode: "01001-000", postalCodeNormalized: "01001000",
    });
  });

  it("preserves international address components without US profile logic", () => {
    const address = normalizeAddress({ line1: "500 Market St", locality: "San Francisco", administrativeArea: "CA", postalCode: "94105-1234", countryCode: "US" });
    expect(formatAddress(address)).toContain("94105-1234");
    expect(address.postalCodeNormalized).toBe("94105-1234");
  });

  it("rejects a malformed Brazilian CEP", () => {
    expect(() => normalizeAddress({ line1: "Rua A", postalCode: "123", countryCode: "BR" })).toThrow("CEP inválido");
  });
});
