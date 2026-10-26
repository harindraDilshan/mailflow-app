import { describe, it, expect } from "vitest";
import { cleanDesign, designOf, parseOrigins, textColorOn, DEFAULT_SUCCESS } from "./forms";
import { buildEmbedSnippet } from "./embed";

describe("designOf", () => {
  it("fills in defaults", () => {
    expect(designOf({ name: "Newsletter" })).toEqual({
      title: "Newsletter",
      text: "",
      button: "Subscribe",
      nameField: "optional",
      success: DEFAULT_SUCCESS,
      color: "#18181b",
    });
  });

  it("refuses a bad color and an unknown name field", () => {
    const d = designOf({ name: "N", formColor: "red; background:url(x)", formNameField: "maybe" });
    expect(d.color).toBe("#18181b");
    expect(d.nameField).toBe("optional");
  });
});

describe("cleanDesign", () => {
  it("keeps one line where one line is expected, and limits lengths", () => {
    const values: Record<string, string> = {
      pageTitle: "Join\nus",
      formButton: "x".repeat(80),
      formColor: "#ABCDEF",
      formNameField: "required",
    };
    const d = cleanDesign((n) => values[n] ?? "");
    expect(d.pageTitle).toBe("Join us");
    expect(d.formButton).toHaveLength(40);
    expect(d.formColor).toBe("#abcdef");
    expect(d.formNameField).toBe("required");
  });
});

describe("textColorOn", () => {
  it("chooses readable text", () => {
    expect(textColorOn("#000000")).toBe("#ffffff");
    expect(textColorOn("#ffeb3b")).toBe("#111111");
  });
});

describe("parseOrigins", () => {
  it("accepts addresses with or without https:// and removes doubles", () => {
    expect(parseOrigins("example.com\nhttps://www.example.com/page, example.com").origins).toEqual([
      "https://example.com",
      "https://www.example.com",
    ]);
  });

  it("refuses empty and broken input", () => {
    expect(parseOrigins("  ").error).toMatch(/Enter the address/);
    expect(parseOrigins("ftp://x.com").error).toMatch(/not a website/);
  });
});

describe("buildEmbedSnippet", () => {
  const design = designOf({ name: "News" });

  it("includes the key, the endpoint, and the honeypot", () => {
    const html = buildEmbedSnippet("https://app.test", "pk_live_abcdef123456", design, { styled: true });
    expect(html).toContain('action="https://app.test/api/v1/subscribe"');
    expect(html).toContain('value="pk_live_abcdef123456"');
    expect(html).toContain('name="hp_field"');
    expect(html).toContain("<style>");
  });

  it("escapes every text from the design (it runs on other websites)", () => {
    const evil = { ...design, title: "<img src=x onerror=alert(1)>", button: "</button><script>x()</script>", success: "</script><script>alert(2)</script>" };
    const html = buildEmbedSnippet("https://app.test", "pk_live_abcdef123456", evil, { styled: false });
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<script>x()");
    expect(html).not.toContain("</script><script>alert(2)");
    expect(html).toContain("\\u003c/script>");
  });

  it("follows the name field setting and the style option", () => {
    const off = buildEmbedSnippet("https://app.test", "pk_live_abcdef123456", { ...design, nameField: "off" }, { styled: false });
    expect(off).not.toContain('name="name"');
    expect(off).not.toContain("<style>");
    const required = buildEmbedSnippet("https://app.test", "pk_live_abcdef123456", { ...design, nameField: "required" }, { styled: false });
    expect(required).toMatch(/name="name"[^>]*required/);
  });
});
