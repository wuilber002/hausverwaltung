import type { PresentationContext } from "./presentation-context";

export type FormattingContext = Pick<PresentationContext, "locale" | "dateFormat" | "timeZone" | "currencyCode">;

export function intlLocale(locale: string) {
  return locale === "de" ? "de-DE" : locale === "en" ? "en-US" : locale;
}

function isFormattingContext(value: FormattingContext | string): value is FormattingContext {
  return typeof value !== "string";
}

function legacyContext(locale: string): FormattingContext {
  return { locale, dateFormat: locale, timeZone: "Europe/Berlin", currencyCode: "EUR" };
}

function contextFor(value: FormattingContext | string): FormattingContext {
  return isFormattingContext(value) ? value : legacyContext(value);
}

export function money(value: number | string, input: FormattingContext | string = "de") {
  const context = contextFor(input);
  const n = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat(intlLocale(context.locale), {
    style: "currency",
    currency: context.currencyCode,
  }).format(n);
}

// Decimal localized, up to four decimal places (for example, ownership shares).
export function decimal(value: number | null | undefined, input: FormattingContext | string = "de") {
  if (value == null) return "—";
  const context = contextFor(input);
  return new Intl.NumberFormat(intlLocale(context.locale), { maximumFractionDigits: 4 }).format(value);
}

// Civil dates are rendered in UTC so date-only values never move one day by tenant timezone.
export function date(value: Date | string | null | undefined, input: FormattingContext | string = "de") {
  if (!value) return "—";
  const context = contextFor(input);
  const d = typeof value === "string" ? new Date(value) : value;
  if (context.dateFormat === "iso") return d.toISOString().slice(0, 10);
  return new Intl.DateTimeFormat(intlLocale(context.dateFormat), { timeZone: "UTC" }).format(d);
}

// Instants such as email and audit events use the tenant timezone.
export function dateTime(
  value: Date | string | null | undefined,
  input: FormattingContext | string = "de",
  legacyTimeZone?: string,
) {
  if (!value) return "—";
  const base = contextFor(input);
  const context = legacyTimeZone ? { ...base, timeZone: legacyTimeZone } : base;
  const d = typeof value === "string" ? new Date(value) : value;
  if (context.dateFormat === "iso") {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", { timeZone: context.timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
        .formatToParts(d).map((x) => [x.type, x.value]),
    );
    return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
  }
  return new Intl.DateTimeFormat(intlLocale(context.locale), {
    dateStyle: "short", timeStyle: "short", timeZone: context.timeZone,
  }).format(d);
}
