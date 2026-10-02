"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { requireWriter } from "@/lib/rbac";
import { normalizeIdentifier } from "@/lib/identifiers";
import { personIdentifierSchema, type ActionState } from "@/lib/schemas";

/**
 * Persiste um identificador sem enviar seu valor ao log ou à auditoria.
 * CPF, CNPJ e CIN brasileiros inválidos são recusados; os demais tipos
 * permanecem explicitamente como UNVERIFIED até haver regra própria.
 */
export async function savePersonIdentifier(_p: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireWriter();
  const t = await getTranslations({ locale: user.locale, namespace: "personIdentifiers" });
  const invalid = (error = t("errorInvalid")): ActionState => ({ error });
  const parsed = personIdentifierSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return invalid();

  const person = await prisma.person.findFirst({
    where: { id: parsed.data.personId, tenantId: user.tenantId },
    select: { id: true },
  });
  if (!person) return invalid(t("errorPersonNotFound"));

  let normalized;
  try {
    normalized = normalizeIdentifier({
      type: parsed.data.type,
      countryCode: parsed.data.countryCode,
      value: parsed.data.value,
    });
  } catch {
    return invalid();
  }
  if (normalized.validationStatus === "INVALID") return invalid();

  if (parsed.data.type === "CIN") {
    if (!parsed.data.basisIdentifierId) return invalid(t("errorCinNeedsCpf"));
    const cpf = await prisma.personIdentifier.findFirst({
      where: {
        id: parsed.data.basisIdentifierId,
        tenantId: user.tenantId,
        personId: person.id,
        type: "CPF",
        validationStatus: "VALID",
      },
      select: { id: true, valueNormalized: true },
    });
    if (!cpf || cpf.valueNormalized !== normalized.valueNormalized) return invalid(t("errorCinCpfMismatch"));
  }

  const data = {
    personId: person.id,
    tenantId: user.tenantId,
    type: normalized.type,
    countryCode: normalized.countryCode,
    valueNormalized: normalized.valueNormalized,
    valueDisplay: normalized.valueDisplay,
    validationStatus: normalized.validationStatus,
    issuer: parsed.data.issuer ?? null,
    issuedIn: parsed.data.issuedIn ?? null,
    issuedAt: parsed.data.issuedAt ?? null,
    basisIdentifierId: parsed.data.type === "CIN" ? parsed.data.basisIdentifierId : null,
  };

  try {
    if (parsed.data.id) {
      const result = await prisma.personIdentifier.updateMany({
        where: { id: parsed.data.id, tenantId: user.tenantId, personId: person.id },
        data,
      });
      if (result.count === 0) return invalid(t("errorNotFound"));
    } else {
      await prisma.personIdentifier.create({ data });
    }
  } catch {
    // Valor propositalmente não aparece na resposta, em logs ou na auditoria.
    return invalid(t("errorDuplicate"));
  }

  await audit(user, "UPDATE", "PersonIdentifier", parsed.data.id ?? person.id, `Tipo: ${normalized.type}`);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deletePersonIdentifier(fd: FormData): Promise<void> {
  const user = await requireWriter();
  const id = String(fd.get("id") ?? "");
  const result = await prisma.personIdentifier.deleteMany({ where: { id, tenantId: user.tenantId } });
  if (result.count) await audit(user, "DELETE", "PersonIdentifier", id, "Identificador removido");
  revalidatePath("/", "layout");
}
