export type StructuredAddressInput = Readonly<{
  line1: string;
  line2?: string | null;
  district?: string | null;
  locality?: string | null;
  administrativeArea?: string | null;
  postalCode?: string | null;
  countryCode: string;
}>;

export type NormalizedAddress = Readonly<StructuredAddressInput & {
  postalCodeNormalized?: string;
}>;

const optional = (value: string | null | undefined) => value?.trim() || undefined;

export function normalizeAddress(input: StructuredAddressInput): NormalizedAddress {
  const countryCode = input.countryCode.trim().toUpperCase();
  const line1 = input.line1.trim();
  if (!line1 || !/^[A-Z]{2}$/.test(countryCode)) throw new Error("Endereço inválido");

  const postalCode = optional(input.postalCode);
  const postalCodeNormalized = countryCode === "BR" && postalCode ? postalCode.replace(/\D/g, "") : postalCode;
  if (countryCode === "BR" && postalCode && postalCodeNormalized?.length !== 8) {
    throw new Error("CEP inválido");
  }

  return {
    line1,
    line2: optional(input.line2),
    district: optional(input.district),
    locality: optional(input.locality),
    administrativeArea: optional(input.administrativeArea),
    postalCode,
    postalCodeNormalized,
    countryCode,
  };
}

export function formatAddress(address: NormalizedAddress): string {
  return [address.line1, address.line2, address.district, address.locality, address.administrativeArea, address.postalCode, address.countryCode]
    .filter(Boolean)
    .join(", ");
}
