"use client";

import { useEffect, useState } from "react";
import { ChevronsUpDown, FileKey2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { CrudDialog } from "@/components/crud-dialog";
import { DeleteButton } from "@/components/delete-button";
import { TextField } from "@/components/form-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deletePersonIdentifier, savePersonIdentifier } from "@/server/actions/person-identifiers";
import { requiresBrazilianCountry } from "@/lib/identifiers";

const identifierTypes = ["CPF", "CNPJ", "CIN", "RG", "IE", "CAEPF", "FOREIGN"] as const;

type Identifier = {
  id: string;
  type: (typeof identifierTypes)[number];
  countryCode: string;
  value: string;
  validationStatus: "UNVERIFIED" | "VALID" | "INVALID";
  issuer: string | null;
  issuedIn: string | null;
  issuedAt: string | null;
};

const countryOptions = [
  { code: "BR", labelKey: "countryBrazil" },
  { code: "DE", labelKey: "countryGermany" },
  { code: "US", labelKey: "countryUnitedStates" },
] as const;

function CountryCombobox({
  countryCode,
  onCountryCodeChange,
  disabled,
}: {
  countryCode: string;
  onCountryCodeChange: (countryCode: string) => void;
  disabled: boolean;
}) {
  const t = useTranslations("personIdentifiers");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const labelFor = (code: string) => {
    const option = countryOptions.find((country) => country.code === code);
    return option ? `${t(option.labelKey)} (${code})` : code;
  };

  useEffect(() => {
    const option = countryOptions.find((country) => country.code === countryCode);
    setQuery(option ? `${t(option.labelKey)} (${countryCode})` : countryCode);
  }, [countryCode, t]);

  const normalizedQuery = query.trim().toUpperCase();
  const matches = countryOptions.filter((country) => {
    const label = t(country.labelKey).toUpperCase();
    return !normalizedQuery || country.code.includes(normalizedQuery) || label.includes(normalizedQuery);
  });
  const customIsoCode = /^[A-Z]{2}$/.test(normalizedQuery) ? normalizedQuery : null;

  function selectCountry(code: string) {
    onCountryCodeChange(code);
    setQuery(labelFor(code));
    setOpen(false);
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="identifierCountryCode">{t("countryCode")}</Label>
      <input type="hidden" name="countryCode" value={countryCode} />
      <div className="relative">
        <div className="flex gap-1">
          <Input
            id="identifierCountryCode"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls="identifier-country-options"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              window.setTimeout(() => {
                setOpen(false);
                setQuery(labelFor(countryCode));
              }, 150);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && customIsoCode) {
                event.preventDefault();
                selectCountry(customIsoCode);
              }
              if (event.key === "Escape") {
                setOpen(false);
                setQuery(labelFor(countryCode));
              }
            }}
            placeholder={t("countrySearch")}
            disabled={disabled}
            required
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label={t("countryCode")}
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setOpen((current) => !current)}
          >
            <ChevronsUpDown className="size-4" />
          </Button>
        </div>
        {!disabled && open && (
          <div
            id="identifier-country-options"
            role="listbox"
            className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-input bg-popover p-1 text-sm shadow-md"
          >
            {matches.map((country) => (
              <button
                key={country.code}
                type="button"
                role="option"
                aria-selected={countryCode === country.code}
                className="flex w-full rounded-md px-2 py-1.5 text-left hover:bg-muted"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectCountry(country.code)}
              >
                {t(country.labelKey)} ({country.code})
              </button>
            ))}
            {customIsoCode && !countryOptions.some((country) => country.code === customIsoCode) && (
              <button
                type="button"
                role="option"
                className="flex w-full rounded-md px-2 py-1.5 text-left hover:bg-muted"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectCountry(customIsoCode)}
              >
                {t("countryUseIsoCode", { code: customIsoCode })}
              </button>
            )}
          </div>
        )}
      </div>
      {disabled && <p className="text-xs text-muted-foreground">{t("countryLockedBR")}</p>}
    </div>
  );
}

function IdentifierDialog({
  personId,
  identifiers,
  defaultCountryCode,
}: {
  personId: string;
  identifiers: Identifier[];
  defaultCountryCode: string;
}) {
  const t = useTranslations("personIdentifiers");
  const [type, setType] = useState<(typeof identifierTypes)[number]>(defaultCountryCode === "BR" ? "CPF" : "FOREIGN");
  const [countryCode, setCountryCode] = useState(defaultCountryCode);
  const brazilianDocument = requiresBrazilianCountry(type);
  useEffect(() => {
    if (brazilianDocument) setCountryCode("BR");
  }, [brazilianDocument]);
  const validCpfIdentifiers = identifiers.filter(
    (identifier) => identifier.type === "CPF" && identifier.validationStatus === "VALID",
  );

  return (
    <CrudDialog
      trigger={
        <Button size="sm">
          <Plus className="size-4" />
          {t("new")}
        </Button>
      }
      title={t("new")}
      action={savePersonIdentifier}
      submitLabel={t("save")}
      preserveFieldsOnError
    >
      <input type="hidden" name="personId" value={personId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="identifierType">{t("type")}</Label>
          <select
            id="identifierType"
            name="type"
            value={type}
            onChange={(event) => setType(event.target.value as (typeof identifierTypes)[number])}
            className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none dark:bg-input/30"
          >
            {identifierTypes.map((identifierType) => (
              <option key={identifierType} value={identifierType}>
                {t(`type${identifierType}`)}
              </option>
            ))}
          </select>
        </div>
        <CountryCombobox
          countryCode={countryCode}
          onCountryCodeChange={setCountryCode}
          disabled={brazilianDocument}
        />
      </div>
      <TextField name="value" label={t("value")} />
      {type === "CIN" && (
        <div className="space-y-2">
          <Label htmlFor="basisIdentifierId">{t("basisCpf")}</Label>
          <select
            id="basisIdentifierId"
            name="basisIdentifierId"
            required
            defaultValue=""
            className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none dark:bg-input/30"
          >
            <option value="" disabled>
              {t("selectBasisCpf")}
            </option>
            {validCpfIdentifiers.map((identifier) => (
              <option key={identifier.id} value={identifier.id}>
                {identifier.value}
              </option>
            ))}
          </select>
          {validCpfIdentifiers.length === 0 && (
            <p className="text-xs text-muted-foreground">{t("basisCpfRequired")}</p>
          )}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="issuer" label={t("issuer")} required={false} />
        <TextField name="issuedIn" label={t("issuedIn")} required={false} />
      </div>
      <TextField name="issuedAt" label={t("issuedAt")} type="date" required={false} />
      <p className="text-xs text-muted-foreground">{t("entryHint")}</p>
    </CrudDialog>
  );
}

export function PersonIdentifiersCard({
  personId,
  identifiers,
  canManage,
  defaultCountryCode,
}: {
  personId: string;
  identifiers: Identifier[];
  canManage: boolean;
  defaultCountryCode: string;
}) {
  const t = useTranslations("personIdentifiers");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileKey2 className="size-4" />
            {t("title")}
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">{t("hint")}</p>
        </div>
        {canManage && (
          <IdentifierDialog
            personId={personId}
            identifiers={identifiers}
            defaultCountryCode={defaultCountryCode}
          />
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {identifiers.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          identifiers.map((identifier) => (
            <div key={identifier.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{t(`type${identifier.type}`)}</span>
                  <Badge variant={identifier.validationStatus === "VALID" ? "secondary" : "outline"}>
                    {t(`status${identifier.validationStatus}`)}
                  </Badge>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {identifier.countryCode} · {identifier.value}
                  {identifier.issuer ? ` · ${identifier.issuer}` : ""}
                  {identifier.issuedIn ? ` · ${identifier.issuedIn}` : ""}
                  {identifier.issuedAt ? ` · ${identifier.issuedAt}` : ""}
                </div>
              </div>
              {canManage && <DeleteButton action={deletePersonIdentifier} id={identifier.id} />}
            </div>
          ))
        )}
        {canManage && identifiers.length > 0 && (
          <p className="pt-1 text-xs text-muted-foreground">{t("replaceHint")}</p>
        )}
      </CardContent>
    </Card>
  );
}
