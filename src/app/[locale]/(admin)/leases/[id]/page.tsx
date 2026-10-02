import { ArrowLeft, X, Check } from "lucide-react";
import { getTranslations, } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { money, date } from "@/lib/format";
import { depositInterest } from "@/lib/deposit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LeaseDialog,
  ComponentDialog,
  AdjustmentDialog,
  DepositDialog,
  RenterDialog,
  BrazilianLeaseTermsDialog,
} from "@/components/lease-dialogs";
import { DeleteButton } from "@/components/delete-button";
import { WohnungsgeberDialog } from "@/components/wohnungsgeber-dialog";
import {
  deleteLease,
  deleteRenter,
  deleteComponent,
  deleteAdjustment,
  applyAdjustment,
  deleteDeposit,
  deleteBrazilianLeaseTerms,
} from "@/server/actions/leases";

export default async function LeaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const t = await getTranslations();

  const wgTenant = await prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { name: true, address: true } });
  const lease = await prisma.lease.findFirst({
    where: { id, tenantId: user.tenantId },
    include: {
      unit: { include: { building: { include: { property: true } }, owners: { include: { person: true } } } },
      renters: { include: { person: true } },
      brazilianTerms: { include: { guarantor: true } },
      components: { orderBy: { type: "asc" } },
      adjustments: { orderBy: { effectiveDate: "asc" } },
      deposit: { include: { account: true } },
    },
  });
  if (!lease) notFound();

  const [persons, units, kautionAccounts, customDefs] = await Promise.all([
    prisma.person.findMany({
      where: { tenantId: user.tenantId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.unit.findMany({
      where: { tenantId: user.tenantId },
      include: { building: { include: { property: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.account.findMany({
      where: { tenantId: user.tenantId, type: "KAUTION" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.customFieldDef.findMany({
      where: { tenantId: user.tenantId, entity: "LEASE" },
      orderBy: { createdAt: "asc" },
      select: { key: true, label: true },
    }),
  ]);
  const personOpts = persons.map((p) => ({ value: p.id, label: `${p.lastName}, ${p.firstName}` }));
  const unitOpts = units.map((u) => ({
    value: u.id,
    label: `${u.building.property.name} · ${u.building.name} · ${u.label}`,
  }));
  const accountOpts = kautionAccounts.map((a) => ({ value: a.id, label: a.name }));

  const warm = Number(lease.rentCold) + lease.components.reduce((a, c) => a + Number(c.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" render={<Link href="/leases" />}>
            <ArrowLeft className="size-4" />
            {t("leases.title")}
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {lease.unit.building.property.name} · {lease.unit.label}
          </h1>
          <p className="text-sm text-muted-foreground">
            {date(lease.startDate, user.presentation)} – {lease.endDate ? date(lease.endDate, user.presentation) : t("leases.unlimited")}
          </p>
        </div>
        <div className="flex gap-1">
          <WohnungsgeberDialog leaseId={lease.id} name={wgTenant?.name ?? ""} address={wgTenant?.address ?? ""} />
          <LeaseDialog
            units={unitOpts}
            customDefs={customDefs}
            lease={{
              id: lease.id,
              unitId: lease.unitId,
              startDate: lease.startDate,
              endDate: lease.endDate,
              rentCold: String(lease.rentCold),
              personCount: lease.personCount,
              noticePeriodM: lease.noticePeriodM,
              custom: (lease.custom as Record<string, string>) ?? {},
            }}
          />
          <DeleteButton action={deleteLease} id={lease.id} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Mieter */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{t("renter.title")}</CardTitle>
            <RenterDialog leaseId={lease.id} persons={personOpts} />
          </CardHeader>
          <CardContent className="space-y-2">
            {lease.renters.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("renter.empty")}</p>
            ) : (
              lease.renters.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="text-sm">
                    {r.person.firstName} {r.person.lastName}
                    {r.person.email ? ` · ${r.person.email}` : ""}
                  </span>
                  <form action={deleteRenter}>
                    <input type="hidden" name="id" value={r.id} />
                    <Button type="submit" variant="ghost" size="icon" aria-label={t("common.delete")}>
                      <X className="size-4" />
                    </Button>
                  </form>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Kaution */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{t("deposit.title")}</CardTitle>
            <DepositDialog
              leaseId={lease.id}
              accounts={accountOpts}
              deposit={
                lease.deposit
                  ? {
                      id: lease.deposit.id,
                      type: lease.deposit.type,
                      amount: String(lease.deposit.amount),
                      accountId: lease.deposit.accountId,
                      interestRate: lease.deposit.interestRate ? String(lease.deposit.interestRate) : null,
                      receivedDate: lease.deposit.receivedDate,
                      returnedDate: lease.deposit.returnedDate,
                    }
                  : undefined
              }
            />
          </CardHeader>
          <CardContent>
            {!lease.deposit ? (
              <p className="text-sm text-muted-foreground">{t("deposit.empty")}</p>
            ) : (
              (() => {
                const dep = lease.deposit;
                const interest = depositInterest(
                  Number(dep.amount),
                  dep.interestRate ? Number(dep.interestRate) : null,
                  dep.receivedDate,
                  dep.returnedDate,
                );
                return (
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5 text-sm">
                      <div className="font-medium">{money(Number(dep.amount), user.presentation)}</div>
                      <div className="text-muted-foreground">
                        {t(`depositType.${dep.type}`)}
                        {dep.account ? ` · ${dep.account.name}` : ""}
                        {dep.receivedDate ? ` · ${date(dep.receivedDate, user.presentation)}` : ""}
                      </div>
                      {interest > 0 && (
                        <div className="text-muted-foreground">
                          {t("deposit.interest")}: {money(interest, user.presentation)} ·{" "}
                          {t("deposit.total")}: {money(Number(dep.amount) + interest, user.presentation)}
                        </div>
                      )}
                      {dep.returnedDate && (
                        <div className="text-xs text-muted-foreground">
                          {t("deposit.returnedDate")}: {date(dep.returnedDate, user.presentation)}
                        </div>
                      )}
                    </div>
                    <DeleteButton action={deleteDeposit} id={dep.id} />
                  </div>
                );
              })()
            )}
          </CardContent>
        </Card>
      </div>

      {user.presentation.marketProfile === "BR" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{t("brazilianLease.title")}</CardTitle>
            <div className="flex items-center gap-1">
              <BrazilianLeaseTermsDialog
                leaseId={lease.id}
                persons={personOpts}
                terms={
                  lease.brazilianTerms
                    ? {
                        contractReference: lease.brazilianTerms.contractReference,
                        dueDay: lease.brazilianTerms.dueDay,
                        guaranteeType: lease.brazilianTerms.guaranteeType,
                        guarantorId: lease.brazilianTerms.guarantorId,
                        guaranteeNote: lease.brazilianTerms.guaranteeNote,
                      }
                    : undefined
                }
              />
              {lease.brazilianTerms && <DeleteButton action={deleteBrazilianLeaseTerms} id={lease.brazilianTerms.id} />}
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {!lease.brazilianTerms ? (
              <p className="text-muted-foreground">{t("brazilianLease.empty")}</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                <div><span className="text-muted-foreground">{t("brazilianLease.purpose")}: </span>{t("brazilianLease.purposeResidential")}</div>
                <div><span className="text-muted-foreground">{t("brazilianLease.dueDay")}: </span>{lease.brazilianTerms.dueDay}</div>
                {lease.brazilianTerms.contractReference && <div><span className="text-muted-foreground">{t("brazilianLease.contractReference")}: </span>{lease.brazilianTerms.contractReference}</div>}
                <div><span className="text-muted-foreground">{t("brazilianLease.guaranteeType")}: </span>{lease.brazilianTerms.guaranteeType ? t(`brazilianLease.guarantees.${lease.brazilianTerms.guaranteeType}`) : t("brazilianLease.none")}</div>
                {lease.brazilianTerms.guarantor && <div><span className="text-muted-foreground">{t("brazilianLease.guarantor")}: </span>{lease.brazilianTerms.guarantor.firstName} {lease.brazilianTerms.guarantor.lastName}</div>}
                {lease.brazilianTerms.guaranteeNote && <div><span className="text-muted-foreground">{t("brazilianLease.guaranteeNote")}: </span>{lease.brazilianTerms.guaranteeNote}</div>}
              </div>
            )}
            <div>
              <p className="mb-1 text-muted-foreground">{t("brazilianLease.owners")}</p>
              {lease.unit.owners.length === 0 ? <p className="text-muted-foreground">{t("brazilianLease.ownersEmpty")}</p> : <p>{lease.unit.owners.map((owner) => `${owner.person.firstName} ${owner.person.lastName}`).join(" · ")}</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Miet-Bestandteile */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">
            {t("rentComponent.title")} · {t("leases.warmRent")}: {money(warm, user.presentation)}
          </CardTitle>
          <ComponentDialog leaseId={lease.id} />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">{t("leases.coldRent")}</TableCell>
                <TableCell className="text-right">{money(Number(lease.rentCold), user.presentation)}</TableCell>
                <TableCell className="w-12" />
              </TableRow>
              {lease.components.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    {t(`rentComponentType.${c.type}`)}
                    {c.note ? ` · ${c.note}` : ""}
                  </TableCell>
                  <TableCell className="text-right">{money(Number(c.amount), user.presentation)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <DeleteButton action={deleteComponent} id={c.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mietanpassungen */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">{t("adjustment.title")}</CardTitle>
          <AdjustmentDialog leaseId={lease.id} />
        </CardHeader>
        <CardContent className="p-0">
          {lease.adjustments.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">{t("adjustment.empty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("fields.type")}</TableHead>
                  <TableHead>{t("adjustment.effectiveDate")}</TableHead>
                  <TableHead className="text-right">{t("adjustment.newRent")}</TableHead>
                  <TableHead>{t("leases.status")}</TableHead>
                  <TableHead className="w-28 text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lease.adjustments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{t(`adjustmentType.${a.type}`)}</TableCell>
                    <TableCell>{date(a.effectiveDate, user.presentation)}</TableCell>
                    <TableCell className="text-right">{money(Number(a.newRentCold), user.presentation)}</TableCell>
                    <TableCell>
                      <Badge variant={a.applied ? "secondary" : "outline"}>
                        {a.applied ? t("adjustment.applied") : t("adjustment.planned")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {!a.applied && (
                          <form action={applyAdjustment}>
                            <input type="hidden" name="id" value={a.id} />
                            <Button type="submit" variant="ghost" size="icon" aria-label={t("adjustment.apply")}>
                              <Check className="size-4" />
                            </Button>
                          </form>
                        )}
                        <DeleteButton action={deleteAdjustment} id={a.id} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
