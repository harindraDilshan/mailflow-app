import { it, expect } from "vitest";
import { renderEmail, extractLinks } from "./render";

it("tracks body links but not mailto or the unsubscribe link", () => {
  const out = renderEmail(
    '<a href="https://a.com/x?y=1&amp;z=2">A</a> <a href="mailto:hi@a.com">M</a>',
    { email: "b@x.com" },
    "https://app.com/unsubscribe?t=1",
    { trackLink: (u) => `https://app.com/t/c/${encodeURIComponent(u)}`, pixelUrl: "https://app.com/t/o/abc" }
  );
  expect(out).toContain("https://app.com/t/c/https%3A%2F%2Fa.com%2Fx%3Fy%3D1%26z%3D2");
  expect(out).toContain('href="mailto:hi@a.com"');
  expect(out).toContain('href="https://app.com/unsubscribe?t=1"');
  expect(out).toContain("/t/o/abc");
});

it("lists each link once", () => {
  expect(extractLinks('<a href="https://a.com">1</a><a href="https://a.com">2</a>')).toEqual(["https://a.com"]);
});