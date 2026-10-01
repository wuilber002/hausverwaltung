import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { resolvePresentationContext } from "@/lib/presentation-context";

export const getTenantPresentationContext = cache(async (tenantId: string, userLocale: string) => {
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: {
      marketProfile: true,
      marketProfileVersion: true,
      timeZone: true,
      currencyCode: true,
      dateFormat: true,
    },
  });

  return resolvePresentationContext(tenant, userLocale);
});
