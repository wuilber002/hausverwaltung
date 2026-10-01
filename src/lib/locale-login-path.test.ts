import { describe, expect, it } from "vitest";
import { loginPathForLocale } from "./locale-login-path";

describe("loginPathForLocale", () => {
  it.each([
    ["de", "/de/login"],
    ["en", "/en/login"],
    ["pt-BR", "/pt-BR/login"],
  ])("preserves %s in the sign-out callback", (locale, expected) => {
    expect(loginPathForLocale(locale)).toBe(expected);
  });
});
