import { describe, it, expect, beforeAll } from "vitest";
import { signConfirm, verifyConfirm } from "./confirm-token";

describe("confirm-token unit tests", () => {
  beforeAll(() => {
    process.env.UNSUBSCRIBE_SECRET = process.env.UNSUBSCRIBE_SECRET || "test-secret-value-for-testing-only-123456";
  });

  it("signs and verifies a valid confirmation token", () => {
    const contactId = "contact_abc123";
    const token = signConfirm(contactId, 48);

    expect(token).toContain(".");
    const parts = token.split(".");
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe(contactId);

    const verified = verifyConfirm(token);
    expect(verified).toBe(contactId);
  });

  it("rejects a tampered signature", () => {
    const contactId = "contact_abc123";
    const token = signConfirm(contactId, 48);
    const parts = token.split(".");
    const tampered = `${parts[0]}.${parts[1]}.tamperedSignatureVal`;

    expect(verifyConfirm(tampered)).toBeNull();
  });

  it("rejects a signature with different byte length without throwing", () => {
    const contactId = "contact_abc123";
    const token = signConfirm(contactId, 48);
    const parts = token.split(".");
    const shortSig = `${parts[0]}.${parts[1]}.short`;
    const longSig = `${parts[0]}.${parts[1]}.aVeryLongSignatureStringThatExceedsNormalLength`;

    expect(() => verifyConfirm(shortSig)).not.toThrow();
    expect(verifyConfirm(shortSig)).toBeNull();
    expect(() => verifyConfirm(longSig)).not.toThrow();
    expect(verifyConfirm(longSig)).toBeNull();
  });

  it("rejects an expired confirmation token", () => {
    const contactId = "contact_abc123";
    // -1 hour means already expired
    const token = signConfirm(contactId, -1);
    expect(verifyConfirm(token)).toBeNull();
  });

  it("rejects malformed or garbage tokens", () => {
    expect(verifyConfirm("")).toBeNull();
    expect(verifyConfirm("garbage")).toBeNull();
    expect(verifyConfirm("a.b")).toBeNull();
    expect(verifyConfirm("a.b.c.d")).toBeNull();
    expect(verifyConfirm("contact.notanumber.signature")).toBeNull();
  });
});
