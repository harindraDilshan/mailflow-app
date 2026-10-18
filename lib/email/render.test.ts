import { it, expect } from "vitest";
import { renderEmail } from "./render";

it("fills in the name and escapes it", () => {
  const out = renderEmail("<p>Hi {{name}}</p>", { name: "<b>Bob</b>", email: "b@x.com" }, "https://x.com/u?t=1");
  expect(out).toContain("Hi &lt;b&gt;Bob&lt;/b&gt;");
});

it("uses 'friend' when there is no name and adds the footer once", () => {
  const out = renderEmail("<p>Hi {{name}}</p>", { name: "", email: "b@x.com" }, "https://x.com/u?t=1");
  expect(out).toContain("Hi friend");
  expect(out.match(/Unsubscribe/g)).toHaveLength(1);
});