import { authenticateBearer, unauthorized } from "@/lib/api-auth";
import { listMaskedPersonIdentifiers } from "@/lib/api-data";
import { IDENTIFIER_READ_ROLES, roleAllows } from "@/lib/rbac";

/**
 * Identificadores pessoais nunca saem em claro pela API. O endpoint exige
 * papel de backoffice e devolve somente valor mascarado e metadados.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await authenticateBearer(req);
  if (!principal) return unauthorized();
  if (!roleAllows(principal.role, IDENTIFIER_READ_ROLES)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  return Response.json(await listMaskedPersonIdentifiers(principal.tenantId, id));
}
