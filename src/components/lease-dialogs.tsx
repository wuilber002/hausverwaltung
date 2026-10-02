import { Plus, Pencil } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { CrudDialog } from "@/components/crud-dialog";
import { TextField, SelectField, MultiSelectField, CustomFields } from "@/components/form-fields";
import {
  createLease,
  updateLease,
  createComponent,
  createAdjustment,
  upsertDeposit,
  addRenter,
  upsertBrazilianLeaseTerms,
} from "@/server/actions/leases";

type Opt = { value: string; label: string };
const iso = (d?: Date | null) => (d ? d.toISOString().slice(0, 10) : undefined);

async function opts(ns: string, keys: string[]): Promise<Opt[]> {
  const t = await getTranslations(ns);
  return keys.map((k) => ({ value: k, label: t(k) }));
}

function CreateTrigger({ label, variant }: { label: string; variant?: "outline" }) {
  return (
    <Button size="sm" variant={variant}>
      <Plus className="size-4" />
      {label}
    </Button>
  );
}

type LeaseData = {
  id: string;
  unitId: string;
  startDate: Date;
  endDate: Date | null;
  rentCold: string;
  personCount: number;
  noticePeriodM: number | null;
  custom?: Record<string, string>;
};

export async function LeaseDialog({
  units,
  persons,
  lease,
  presetUnitId,
  presetPersonId,
  triggerLabel,
  customDefs = [],
}: {
  units?: Opt[];
  persons?: Opt[];
  lease?: LeaseData;
  presetUnitId?: string; // Einheit vorbelegt+gesperrt (von Unit-Detail)
  presetPersonId?: string; // Person vorbelegt+gesperrt (von Person-Detail)
  triggerLabel?: string;
  customDefs?: { key: string; label: string }[];
}) {
  const t = await getTranslations();
  const edit = !!lease;
  return (
    <CrudDialog
      trigger={
        edit ? (
          <Button variant="ghost" size="icon" aria-label={t("common.edit")} title={t("common.edit")}>
            <Pencil className="size-4" />
          </Button>
        ) : (
          <CreateTrigger label={triggerLabel ?? t("leases.new")} />
        )
      }
      title={edit ? t("leases.edit") : t("leases.new")}
      action={edit ? updateLease : createLease}
      submitLabel={edit ? t("common.save") : t("common.create")}
    >
      {edit && <input type="hidden" name="id" value={lease!.id} />}

      {/* Einheit: im Create + Edit wählbar; per Preset gesperrt */}
      {presetUnitId ? (
        <input type="hidden" name="unitId" value={presetUnitId} />
      ) : (
        <SelectField
          name="unitId"
          label={t("leases.selectUnit")}
          options={units ?? []}
          defaultValue={lease?.unitId}
        />
      )}

      {/* Mieter-Person(en) nur im Create (im Edit über Mieter-Verwaltung).
          Mehrfachauswahl für Verträge mit mehreren Mietern. */}
      {!edit &&
        (presetPersonId ? (
          <input type="hidden" name="personIds" value={presetPersonId} />
        ) : (
          <MultiSelectField name="personIds" label={t("leases.selectPersons")} options={persons ?? []} />
        ))}
      <div className="grid grid-cols-2 gap-4">
        <TextField name="startDate" label={t("leases.start")} type="date" defaultValue={iso(lease?.startDate)} />
        <TextField
          name="endDate"
          label={t("leases.end")}
          type="date"
          required={false}
          defaultValue={iso(lease?.endDate)}
        />
      </div>
      <TextField
        name="rentCold"
        label={t("leases.coldRent")}
        type="number"
        step="0.01"
        defaultValue={lease?.rentCold}
      />
      <div className="grid grid-cols-2 gap-4">
        <TextField
          name="personCount"
          label={t("leases.personCount")}
          type="number"
          defaultValue={lease?.personCount ?? 1}
        />
        <TextField
          name="noticePeriodM"
          label={t("leases.noticePeriod")}
          type="number"
          required={false}
          defaultValue={lease?.noticePeriodM ?? undefined}
        />
      </div>
      <CustomFields defs={customDefs} values={lease?.custom} />
    </CrudDialog>
  );
}

type BrazilianLeaseTermsData = {
  contractReference: string | null;
  dueDay: number;
  guaranteeType: "CAUCAO" | "FIANCA" | "SEGURO_FIANCA" | "FIDUCIARY_FUND_QUOTAS" | null;
  guarantorId: string | null;
  guaranteeNote: string | null;
};

export async function BrazilianLeaseTermsDialog({
  leaseId,
  persons,
  terms,
}: {
  leaseId: string;
  persons: Opt[];
  terms?: BrazilianLeaseTermsData;
}) {
  const t = await getTranslations("brazilianLease");
  return (
    <CrudDialog
      trigger={<CreateTrigger label={terms ? t("edit") : t("set")} variant="outline" />}
      title={terms ? t("edit") : t("set")}
      action={upsertBrazilianLeaseTerms}
      submitLabel={t("save")}
      preserveFieldsOnError
    >
      <input type="hidden" name="leaseId" value={leaseId} />
      <TextField name="contractReference" label={t("contractReference")} required={false} defaultValue={terms?.contractReference ?? undefined} />
      <TextField name="dueDay" label={t("dueDay")} type="number" defaultValue={terms?.dueDay ?? 10} />
      <SelectField
        name="guaranteeType"
        label={t("guaranteeType")}
        defaultValue={terms?.guaranteeType ?? ""}
        options={[
          { value: "", label: t("none") },
          { value: "CAUCAO", label: t("guarantees.CAUCAO") },
          { value: "FIANCA", label: t("guarantees.FIANCA") },
          { value: "SEGURO_FIANCA", label: t("guarantees.SEGURO_FIANCA") },
          { value: "FIDUCIARY_FUND_QUOTAS", label: t("guarantees.FIDUCIARY_FUND_QUOTAS") },
        ]}
      />
      <SelectField
        name="guarantorId"
        label={t("guarantor")}
        defaultValue={terms?.guarantorId ?? ""}
        options={[{ value: "", label: t("none") }, ...persons]}
      />
      <TextField name="guaranteeNote" label={t("guaranteeNote")} required={false} defaultValue={terms?.guaranteeNote ?? undefined} />
    </CrudDialog>
  );
}

export async function ComponentDialog({ leaseId }: { leaseId: string }) {
  const t = await getTranslations();
  return (
    <CrudDialog
      trigger={<CreateTrigger label={t("rentComponent.new")} variant="outline" />}
      title={t("rentComponent.new")}
      action={createComponent}
      submitLabel={t("common.create")}
    >
      <input type="hidden" name="leaseId" value={leaseId} />
      <SelectField
        name="type"
        label={t("fields.type")}
        options={await opts("rentComponentType", [
          "NEBENKOSTEN",
          "HEIZKOSTEN",
          "STELLPLATZ",
          "MODERNISIERUNG",
          "SONSTIGES",
        ])}
      />
      <TextField name="amount" label={t("fields.value")} type="number" step="0.01" />
      <TextField name="note" label={t("rentComponent.note")} required={false} />
    </CrudDialog>
  );
}

export async function AdjustmentDialog({ leaseId }: { leaseId: string }) {
  const t = await getTranslations();
  return (
    <CrudDialog
      trigger={<CreateTrigger label={t("adjustment.new")} variant="outline" />}
      title={t("adjustment.new")}
      action={createAdjustment}
      submitLabel={t("common.create")}
    >
      <input type="hidden" name="leaseId" value={leaseId} />
      <SelectField
        name="type"
        label={t("fields.type")}
        options={await opts("adjustmentType", ["STAFFEL", "INDEX"])}
      />
      <TextField name="effectiveDate" label={t("adjustment.effectiveDate")} type="date" />
      <TextField name="newRentCold" label={t("adjustment.newRent")} type="number" step="0.01" />
      <div className="grid grid-cols-2 gap-4">
        <TextField name="indexBase" label={t("adjustment.indexBase")} type="number" step="0.01" required={false} />
        <TextField name="indexNew" label={t("adjustment.indexNew")} type="number" step="0.01" required={false} />
      </div>
    </CrudDialog>
  );
}

type DepositData = {
  id: string;
  type: string;
  amount: string;
  accountId: string | null;
  interestRate: string | null;
  receivedDate: Date | null;
  returnedDate: Date | null;
};

export async function DepositDialog({
  leaseId,
  deposit,
  accounts,
}: {
  leaseId: string;
  deposit?: DepositData;
  accounts: Opt[];
}) {
  const t = await getTranslations();
  const edit = !!deposit;
  return (
    <CrudDialog
      trigger={<CreateTrigger label={edit ? t("deposit.edit") : t("deposit.set")} variant="outline" />}
      title={edit ? t("deposit.edit") : t("deposit.set")}
      action={upsertDeposit}
      submitLabel={t("common.save")}
    >
      <input type="hidden" name="leaseId" value={leaseId} />
      <SelectField
        name="type"
        label={t("fields.type")}
        defaultValue={deposit?.type ?? "BAR"}
        options={await opts("depositType", ["BAR", "BUERGSCHAFT", "VERPFAENDET", "KAUTIONSKONTO"])}
      />
      <TextField name="amount" label={t("fields.value")} type="number" step="0.01" defaultValue={deposit?.amount} />
      <SelectField
        name="accountId"
        label={t("deposit.account")}
        defaultValue={deposit?.accountId ?? ""}
        options={[{ value: "", label: t("common.none") }, ...accounts]}
      />
      <div className="grid grid-cols-2 gap-4">
        <TextField
          name="interestRate"
          label={t("deposit.interestRate")}
          type="number"
          step="0.01"
          required={false}
          defaultValue={deposit?.interestRate ?? undefined}
        />
        <TextField
          name="receivedDate"
          label={t("deposit.receivedDate")}
          type="date"
          required={false}
          defaultValue={iso(deposit?.receivedDate)}
        />
      </div>
      <TextField
        name="returnedDate"
        label={t("deposit.returnedDate")}
        type="date"
        required={false}
        defaultValue={iso(deposit?.returnedDate)}
      />
    </CrudDialog>
  );
}

export async function RenterDialog({ leaseId, persons }: { leaseId: string; persons: Opt[] }) {
  const t = await getTranslations();
  return (
    <CrudDialog
      trigger={<CreateTrigger label={t("renter.add")} variant="outline" />}
      title={t("renter.add")}
      action={addRenter}
      submitLabel={t("common.add")}
    >
      <input type="hidden" name="leaseId" value={leaseId} />
      <SelectField name="personId" label={t("leases.selectPerson")} options={persons} />
    </CrudDialog>
  );
}
