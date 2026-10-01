/** Builds a locale-preserving login path for authentication callbacks. */
export function loginPathForLocale(locale: string): string {
  return `/${locale}/login`;
}
