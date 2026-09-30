import { describe, expect, it } from "vitest";
import { date, dateTime, decimal, money } from "./format";

describe("pt-BR formatting", () => {
  it("formats currency and decimal values", () => {
    expect(money(1234.5, "pt-BR")).toMatch(/R?\$?\s?1\.234,50|€\s?1\.234,50/);
    expect(decimal(1234.5678, "pt-BR")).toBe("1.234,5678");
  });

  it("formats dates and date-times", () => {
    expect(date("2026-03-15T12:00:00Z", "pt-BR")).toBe("15/03/2026");
    expect(dateTime("2026-03-15T12:00:00Z", "pt-BR", "UTC")).toContain("15/03/2026");
  });
});
