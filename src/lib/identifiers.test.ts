import { describe, expect, it } from "vitest";
import { isValidCnpj, isValidCpf, maskIdentifier, normalizeIdentifier } from "./identifiers";

describe("Brazilian identifiers", () => {
  it("validates and normalizes CPF without exposing formatting as identity", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("52998224725")).toBe(true);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("529.982.247-26")).toBe(false);
    expect(normalizeIdentifier({ type: "CPF", countryCode: "br", value: "529.982.247-25" })).toMatchObject({
      countryCode: "BR", valueNormalized: "52998224725", validationStatus: "VALID",
    });
  });

  it("validates CNPJ and does not accept non-document characters", () => {
    expect(isValidCnpj("04.252.011/0001-10")).toBe(true);
    expect(isValidCnpj("04.252.011/0001-11")).toBe(false);
    expect(() => normalizeIdentifier({ type: "CNPJ", countryCode: "BR", value: "04.252.011/0001-10x" })).toThrow();
  });

  it("models CIN with CPF validation and masks values for presentation", () => {
    expect(normalizeIdentifier({ type: "CIN", countryCode: "BR", value: "52998224725" }).validationStatus).toBe("VALID");
    expect(maskIdentifier("CPF", "52998224725")).toBe("***.***.***-25");
    expect(maskIdentifier("CNPJ", "04252011000110")).toBe("**.***.***/****-10");
    expect(maskIdentifier("FOREIGN", "ABCD-1234")).toBe("••••1234");
  });
});
