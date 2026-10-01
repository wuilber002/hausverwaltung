import { describe, expect, it } from "vitest";
import { resolvePresentationContext } from "./presentation-context";

describe("presentation context", () => {
  it("preserves legacy DE defaults while allowing a pt-BR interface", () => {
    expect(resolvePresentationContext({
      marketProfile: "DE", marketProfileVersion: 1, timeZone: "Europe/Berlin", currencyCode: "EUR", dateFormat: null,
    }, "pt-BR")).toMatchObject({
      marketProfile: "DE", locale: "pt-BR", dateFormat: "pt-BR", timeZone: "Europe/Berlin", currencyCode: "EUR",
    });
  });

  it("uses BR defaults independently from the interface locale", () => {
    expect(resolvePresentationContext({
      marketProfile: "BR", marketProfileVersion: 1, timeZone: "America/Sao_Paulo", currencyCode: "BRL", dateFormat: null,
    }, "en")).toMatchObject({
      marketProfile: "BR", locale: "en", dateFormat: "en", timeZone: "America/Sao_Paulo", currencyCode: "BRL",
    });
  });

  it("falls back safely to historic DE defaults for legacy records", () => {
    expect(resolvePresentationContext({
      marketProfile: null, marketProfileVersion: null, timeZone: null, currencyCode: null, dateFormat: null,
    }, null)).toMatchObject({
      marketProfile: "DE", locale: "de", timeZone: "Europe/Berlin", currencyCode: "EUR",
    });
  });
});
