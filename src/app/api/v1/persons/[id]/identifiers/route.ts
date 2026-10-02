import { authenticateBearer, unauthorized } from "@/lib/api-auth";
import { listMaskedPersonIdentifiers } from "@/lib/api-data";
import { IDENTIFIER_READ_ROLES, roleAllows } from "@/lib/rbac";
import { normalizeIdentifier } from "@/lib/identifiers";
import { personIdentifierSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";

function allowed(role: Parameters<typeof roleAllows>[0]) {
  return roleAllows(role, IDENTIFIER_READ_ROLES);
}

/**
 * Identificadores pessoais nunca saem em claro pela API. O endpoint exige
 * papel de backoffice e devolve somente valor mascarado e metadados.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await authenticateBearer(req);
  if (!principal) return unauthorized();
  if (!allowed(principal.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  return Response.json(await listMaskedPersonIdentifiers(principal.tenantId, id));
}

/** Cria um identificador por API, validando-o antes de persistir o valor. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await authenticateBearer(req);
  if (!principal) return unauthorized();
  if (!allowed(principal.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id: personId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = personIdentifierSchema.safeParse({ ...(body ?? {}), personId });
  if (!parsed.success) return Response.json({ error: "Identificador inválido" }, { status: 400 });

  const person = await prisma.person.findFirst({
    where: { id: personId, tenantId: principal.tenantId },
    select: { id: true },
  });
  if (!person) return Response.json({ error: "Not found" }, { status: 404 });

  let normalized;
  try {
    normalized = normalizeIdentifier({
      type: parsed.data.type,
      countryCode: parsed.data.countryCode,
      value: parsed.data.value,
    });
  } catch {
    return Response.json({ error: "Identificador inválido" }, { status: 400 });
  }
  if (normalized.validationStatus === "INVALID") {
    return Response.json({ error: "Identificador inválido" }, { status: 400 });
  }

  if (parsed.data.type === "CIN") {
    if (!parsed.data.basisIdentifierId) return Response.json({ error: "CIN requer CPF vinculado" }, { status: 400 });
    const cpf = await prisma.personIdentifier.findFirst({
      where: {
        id: parsed.data.basisIdentifierId,
        tenantId: principal.tenantId,
        personId,
        type: "CPF",
        validationStatus: "VALID",
      },
      select: { valueNormalized: true },
    });
    if (!cpf || cpf.valueNormalized !== normalized.valueNormalized) {
      return Response.json({ error: "CIN requer CPF validado da mesma pessoa" }, { status: 400 });
    }
  }

  try {
    const created = await prisma.personIdentifier.create({
      data: {
        tenantId: principal.tenantId,
        personId,
        type: normalized.type,
        countryCode: normalized.countryCode,
        valueNormalized: normalized.valueNormalized,
        valueDisplay: normalized.valueDisplay,
        validationStatus: normalized.validationStatus,
        issuer: parsed.data.issuer ?? null,
        issuedIn: parsed.data.issuedIn ?? null,
        issuedAt: parsed.data.issuedAt ?? null,
        basisIdentifierId: parsed.data.type === "CIN" ? parsed.data.basisIdentifierId : null,
      },
    });
    const records = await listMaskedPersonIdentifiers(principal.tenantId, personId);
    return Response.json(records.find((record) => record.id === created.id), { status: 201 });
  } catch {
    return Response.json({ error: "Documento já está associado a uma pessoa" }, { status: 409 });
  }
}
