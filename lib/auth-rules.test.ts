import { describe, it, expect } from "vitest";
import {
  authErrorMessage, isUnauthorized, needsFreshCode, needsSecondFactor, passwordProblem, passwordStrength, safeNext,
} from "./auth-rules";

describe("passwordProblem", () => {
  it("needs a minimum length and refuses common passwords", () => {
    expect(passwordProblem("short")).toMatch(/at least 8/);
    expect(passwordProblem("Password123")).toMatch(/too common/);
    expect(passwordProblem("aaaaaaaaaa")).toMatch(/too common/);
    expect(passwordProblem("x".repeat(257))).toMatch(/at most/);
  });

  it("refuses the email or name in the password", () => {
    expect(passwordProblem("janedoe-2026!", { email: "janedoe@x.com" })).toMatch(/email/);
    expect(passwordProblem("Harindra#2026", { name: "Harindra Dilshan" })).toMatch(/name/);
  });

  it("accepts a long passphrase without symbols (no composition rules)", () => {
    expect(passwordProblem("correct horse battery staple", { email: "a@x.com", name: "Ann" })).toBeNull();
  });
});

describe("passwordStrength", () => {
  it("rates longer and more varied passwords higher", () => {
    expect(passwordStrength("").score).toBe(0);
    expect(passwordStrength("abc").score).toBe(1);
    expect(passwordStrength("abcdefgh").score).toBeLessThan(passwordStrength("Tr0ub4dor&3-horse-staple").score);
    expect(passwordStrength("Tr0ub4dor&3-horse-staple").label).toBe("Strong");
  });
});

describe("safeNext", () => {
  it("keeps paths on this site", () => {
    expect(safeNext("/campaigns/abc?tab=report")).toBe("/campaigns/abc?tab=report");
  });

  it("refuses other sites and auth pages", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "/login", "/signup?x=1", 42, null]) {
      expect(safeNext(bad)).toBe("/dashboard");
    }
  });
});

describe("Appwrite errors", () => {
  it("knows the 2-step and fresh-code errors", () => {
    expect(needsSecondFactor({ type: "user_more_factors_required", code: 401 })).toBe(true);
    expect(needsSecondFactor({ type: "user_invalid_credentials", code: 401 })).toBe(false);
    expect(needsFreshCode({ type: "user_challenge_required", code: 401 })).toBe(true);
  });

  it("only treats 401 and 403 as logged out", () => {
    expect(isUnauthorized({ code: 401 })).toBe(true);
    expect(isUnauthorized({ code: 500 })).toBe(false);
    expect(isUnauthorized(new Error("fetch failed"))).toBe(false);
  });

  it("shows known messages and hides unknown details", () => {
    expect(authErrorMessage({ type: "user_invalid_credentials" })).toBe("Wrong email or password.");
    expect(authErrorMessage({ code: 429 })).toMatch(/Too many attempts/);
    expect(authErrorMessage({ type: "x", message: "SQLSTATE secret detail" }, "Could not log in.")).toBe("Could not log in.");
  });
});
