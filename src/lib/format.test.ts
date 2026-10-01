import { describe, expect, it } from "vitest";
import { date, dateTime, decimal, money } from "./format";

const de = { locale: "de", dateFormat: "de", timeZone: "Europe/Berlin", currencyCode: "EUR" } as const;
const br = { locale: "pt-BR", dateFormat: "pt-BR", timeZone: "America/Sao_Paulo", currencyCode: "BRL" } as const;

describe("presentation formatting", () => {
  it("keeps DE currency while allowing a pt-BR interface", () => {
    expect(money(1234.5, { ...de, locale: "pt-BR" })).toContain("€");
  });

  it("uses BRL for the BR market context", () => {
    expect(money(1234.5, br)).toMatch(/R\$\s?1\.234,50/);
    expect(decimal(1234.5678, br)).toBe("1.234,5678");
  });

  it("keeps civil dates stable and formats instants in the tenant timezone", () => {
    expect(date("2026-03-15T00:00:00Z", br)).toBe("15/03/2026");
    expect(dateTime("2026-03-15T01:30:00Z", br)).toContain("14/03/2026");
    expect(dateTime("2026-03-15T01:30:00Z", de)).toContain("15.03.26");
  });

  it("retains the legacy call signatures during migration", () => {
    expect(money(1234.5, "pt-BR")).toContain("€");
    expect(dateTime("2026-03-15T12:00:00Z", "pt-BR", "UTC")).toContain("15/03/2026");
  });
});
