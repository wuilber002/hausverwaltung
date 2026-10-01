"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { needsSetup } from "@/lib/setup";
import { ensureDefaultAccounts } from "@/lib/accounts";
import { normalizeAddress } from "@/lib/address";
import { setupSchema, type ActionState } from "@/lib/schemas";

// Ersteinrichtung: legt ersten Mandanten + Administrator an. Nur bei leerem System.
export async function setupSystem(_p: ActionState, fd: FormData): Promise<ActionState> {
  if (!(await needsSetup())) return { error: "System ist bereits eingerichtet." };

  const r = setupSchema.safeParse(Object.fromEntries(fd));
  if (!r.success) return { error: r.error.issues[0]?.message ?? "Ungültige Eingabe" };
  const { tenantName, name, email, password, locale, brandColor, propertyName, propertyStreet, propertyZip, propertyCity } = r.data;

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { error: "E-Mail bereits vergeben." };

  const tenant = await prisma.tenant.create({
    data: {
      name: tenantName,
      brandColor: brandColor || null,
      users: {
        create: {
          email,
          name,
          passwordHash: await bcrypt.hash(password, 10),
          role: "ADMIN",
          superAdmin: true, // erster Admin = Instanz-Admin
          locale,
        },
      },
    },
  });

  // Standard-Kontenrahmen anlegen
  await ensureDefaultAccounts(prisma, tenant.id, locale);

  // Optionales erstes Objekt
  if (propertyName) {
    const street = propertyStreet || "-";
    const zip = propertyZip || "-";
    const city = propertyCity || "-";
    const address = normalizeAddress({ line1: street, locality: city, postalCode: zip, countryCode: "DE" });
    await prisma.$transaction(async (tx) => {
      const structuredAddress = await tx.address.create({ data: { ...address, tenantId: tenant.id } });
      await tx.property.create({
        data: { tenantId: tenant.id, name: propertyName, street, zip, city, addressId: structuredAddress.id },
      });
    });
  }

  redirect("/login");
}
