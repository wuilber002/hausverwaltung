export const PERSON_IDENTIFIER_TYPES = ["CPF", "CNPJ", "CIN", "RG", "IE", "CAEPF", "FOREIGN"] as const;

export type PersonIdentifierType = (typeof PERSON_IDENTIFIER_TYPES)[number];
export type IdentifierValidationStatus = "UNVERIFIED" | "VALID" | "INVALID";

export type NormalizedIdentifier = Readonly<{
  type: PersonIdentifierType;
  countryCode: string;
  valueNormalized: string;
  valueDisplay: string;
  validationStatus: IdentifierValidationStatus;
}>;

const DOCUMENT_SEPARATORS = /^[0-9.\-/\s]+$/;

export function normalizeCountryCode(value: string): string {
  return value.trim().toUpperCase();
}

function digits(value: string): string {
  return value.replace(/\D/g, "");
}

function hasOnlyDocumentSeparators(value: string): boolean {
  return DOCUMENT_SEPARATORS.test(value);
}

function allDigitsEqual(value: string): boolean {
  return /^(\d)\1+$/.test(value);
}

export function isValidCpf(value: string): boolean {
  if (!hasOnlyDocumentSeparators(value)) return false;
  const normalized = digits(value);
  if (normalized.length !== 11 || allDigitsEqual(normalized)) return false;

  const checkDigit = (slice: string, weight: number) => {
    const total = [...slice].reduce((sum, digit, index) => sum + Number(digit) * (weight - index), 0);
    const remainder = (total * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return checkDigit(normalized.slice(0, 9), 10) === Number(normalized[9])
    && checkDigit(normalized.slice(0, 10), 11) === Number(normalized[10]);
}

export function isValidCnpj(value: string): boolean {
  if (!hasOnlyDocumentSeparators(value)) return false;
  const normalized = digits(value);
  if (normalized.length !== 14 || allDigitsEqual(normalized)) return false;

  const checkDigit = (slice: string, weights: number[]) => {
    const total = [...slice].reduce((sum, digit, index) => sum + Number(digit) * weights[index], 0);
    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return checkDigit(normalized.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(normalized[12])
    && checkDigit(normalized.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(normalized[13]);
}

export function normalizeIdentifier(input: {
  type: PersonIdentifierType;
  countryCode: string;
  value: string;
}): NormalizedIdentifier {
  const countryCode = normalizeCountryCode(input.countryCode);
  const valueDisplay = input.value.trim();
  if (!/^[A-Z]{2}$/.test(countryCode) || !valueDisplay) {
    throw new Error("Identificador inválido");
  }

  if ((input.type === "CPF" || input.type === "CNPJ" || input.type === "CIN") && countryCode === "BR") {
    if (!hasOnlyDocumentSeparators(valueDisplay)) throw new Error("Identificador inválido");
    const valueNormalized = digits(valueDisplay);
    const valid = input.type === "CNPJ" ? isValidCnpj(valueDisplay) : isValidCpf(valueDisplay);
    return {
      type: input.type,
      countryCode,
      valueNormalized,
      valueDisplay,
      validationStatus: valid ? "VALID" : "INVALID",
    };
  }

  return {
    type: input.type,
    countryCode,
    valueNormalized: valueDisplay.replace(/\s/g, "").toUpperCase(),
    valueDisplay,
    validationStatus: "UNVERIFIED",
  };
}

export function maskIdentifier(type: PersonIdentifierType, value: string): string {
  const normalized = digits(value);
  if (type === "CPF" || type === "CIN") {
    return normalized.length >= 2 ? `***.***.***-${normalized.slice(-2)}` : "***";
  }
  if (type === "CNPJ") {
    return normalized.length >= 2 ? `**.***.***/****-${normalized.slice(-2)}` : "***";
  }
  const visible = value.trim().slice(-4);
  return visible ? `••••${visible}` : "••••";
}
