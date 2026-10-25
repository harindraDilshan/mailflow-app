import { describe, it, expect } from "vitest";
import { hashKey, normalizeOrigin } from "./api-keys";

describe("api-keys unit tests", () => {
  it("computes deterministic sha256 hash for keys", () => {
    const key = "sk_live_testkey1234567890abcdef";
    const h1 = hashKey(key);
    const h2 = hashKey(key);
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
    expect(h1).not.toBe(key);
  });

  it("normalizes valid origins properly", () => {
    expect(normalizeOrigin("https://example.com")).toBe("https://example.com");
    expect(normalizeOrigin("http://localhost:3000/")).toBe("http://localhost:3000");
    expect(normalizeOrigin("  HTTPS://WWW.EXAMPLE.COM/path?query=1  ")).toBe("https://www.example.com");
    expect(normalizeOrigin("https://Sub.Domain.org:8080/deep/link")).toBe("https://sub.domain.org:8080");
  });

  it("rejects invalid, malformed, or non-http/https origins", () => {
    expect(normalizeOrigin("")).toBeNull();
    expect(normalizeOrigin("not-a-url")).toBeNull();
    expect(normalizeOrigin("ftp://ftp.example.com")).toBeNull();
    expect(normalizeOrigin("javascript:alert(1)")).toBeNull();
    expect(normalizeOrigin("null")).toBeNull();
  });

  it("validates live key format regex", () => {
    const regex = /^(pk|sk)_live_[A-Za-z0-9_-]{20,64}$/;
    expect(regex.test("pk_live_1234567890abcdef1234567890abcdef")).toBe(true);
    expect(regex.test("sk_live_1234567890abcdef1234567890abcdef")).toBe(true);
    expect(regex.test("test_key_12345")).toBe(false);
    expect(regex.test("sk_test_1234567890abcdef1234567890abcdef")).toBe(false);
    expect(regex.test("")).toBe(false);
  });
});
