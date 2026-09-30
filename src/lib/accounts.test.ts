import { describe, expect, it, vi } from "vitest";
import { defaultAccounts, ensureDefaultAccounts } from "./accounts";

describe("defaultAccounts", () => {
  it("uses Portuguese names for pt-BR", () => {
    expect(defaultAccounts("pt-BR").map((account) => account.name)).toEqual([
      "Conta corrente",
      "Conta de caução",
      "Fundo de reserva",
      "Receitas de aluguel",
      "Despesas operacionais",
      "Manutenção",
      "Despesas administrativas",
    ]);
  });

  it("falls back to German for an unsupported locale", () => {
    expect(defaultAccounts("fr")[0]?.name).toBe("Girokonto");
  });

  it("creates Portuguese names for an empty chart of accounts", async () => {
    const account = {
      count: vi.fn().mockResolvedValue(0),
      createMany: vi.fn().mockResolvedValue({ count: 7 }),
    };

    await expect(ensureDefaultAccounts({ account } as never, "tenant-id", "pt-BR")).resolves.toBe(7);
    expect(account.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ tenantId: "tenant-id", name: "Conta corrente", type: "BANK" }),
        expect.objectContaining({ tenantId: "tenant-id", name: "Fundo de reserva", type: "RUECKLAGE" }),
      ]),
    });
  });

  it("does not alter an existing chart of accounts", async () => {
    const account = {
      count: vi.fn().mockResolvedValue(1),
      createMany: vi.fn(),
    };

    await expect(ensureDefaultAccounts({ account } as never, "tenant-id", "pt-BR")).resolves.toBe(0);
    expect(account.createMany).not.toHaveBeenCalled();
  });
});
