import { describe, expect, it } from "vitest";
import { brazilianLeaseTermsSchema } from "./schemas";

const valid = {
  leaseId: "lease-1",
  dueDay: "10",
  guaranteeType: "FIANCA",
  guarantorId: "person-1",
};

describe("brazilianLeaseTermsSchema", () => {
  it("accepts the inclusive Brazilian contractual due-day range", () => {
    expect(brazilianLeaseTermsSchema.safeParse({ ...valid, dueDay: "1" }).success).toBe(true);
    expect(brazilianLeaseTermsSchema.safeParse({ ...valid, dueDay: "31" }).success).toBe(true);
  });

  it("rejects due days outside the calendar range", () => {
    expect(brazilianLeaseTermsSchema.safeParse({ ...valid, dueDay: "0" }).success).toBe(false);
    expect(brazilianLeaseTermsSchema.safeParse({ ...valid, dueDay: "32" }).success).toBe(false);
  });

  it("accepts one optional guarantee type or no guarantee", () => {
    expect(brazilianLeaseTermsSchema.safeParse(valid).success).toBe(true);
    expect(brazilianLeaseTermsSchema.safeParse({ leaseId: "lease-1", dueDay: "10", guaranteeType: "" }).success).toBe(true);
    expect(brazilianLeaseTermsSchema.safeParse({ ...valid, guaranteeType: "TWO_GUARANTEES" }).success).toBe(false);
  });
});
