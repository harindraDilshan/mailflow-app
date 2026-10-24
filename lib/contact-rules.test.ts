import { it, expect } from "vitest";
import { normalizeEmail, isValidEmail, normalizeTags, STATUSES } from "./contact-rules";

it("cleans and checks emails", () => {
  expect(normalizeEmail("  John@Shop.COM ")).toBe("john@shop.com");
  expect(isValidEmail("john@shop.com")).toBe(true);
  expect(isValidEmail("john@shop")).toBe(false);
  expect(isValidEmail("john smith@shop.com")).toBe(false);
  expect(isValidEmail("a..b@shop.com")).toBe(false);
});

it("cleans tags", () => {
  expect(normalizeTags(" VIP, news ,vip,,")).toEqual(["vip", "news"]);
});

it("includes archived in statuses", () => {
  expect(STATUSES).toContain("archived");
});
