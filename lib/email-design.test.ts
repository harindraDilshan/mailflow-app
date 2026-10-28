import { describe, it, expect } from "vitest";
import { blankDesign, blockIssue, newBlock, parseDesign, renderDesign, richText, safeHref, type EmailDesign } from "./email-design";

const design = (blocks: unknown[]): EmailDesign => parseDesign({ settings: {}, blocks })!;

describe("richText", () => {
  it("knows bold, italic, links, and paragraphs", () => {
    const html = richText("Hi **Ann**, *thanks*.\n\nRead [our blog](https://a.com/x?y=1&z=2).", "#2563eb");
    expect(html).toContain("<strong>Ann</strong>");
    expect(html).toContain("<em>thanks</em>");
    expect(html).toContain('<a href="https://a.com/x?y=1&amp;z=2"');
    expect(html.match(/<p /g)).toHaveLength(2);
  });

  it("escapes HTML and refuses unsafe links", () => {
    const html = richText('<script>x()</script> [click](javascript:alert(1))', "#000000");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("click");
  });

  it("keeps merge tags", () => {
    expect(richText("Hi {{name}}", "#000000")).toContain("{{name}}");
  });
});

describe("safeHref", () => {
  it("allows web, mail, phone, and merge tags only", () => {
    expect(safeHref("https://a.com")).toBe("https://a.com");
    expect(safeHref("mailto:a@b.com")).toBe("mailto:a@b.com");
    expect(safeHref("{{unsubscribe}}")).toBe("{{unsubscribe}}");
    expect(safeHref("javascript:alert(1)")).toBe("#");
    expect(safeHref("data:text/html,x")).toBe("#");
  });
});

describe("parseDesign", () => {
  it("cleans colors, sizes, and unknown blocks", () => {
    const d = parseDesign({
      settings: { background: "red", width: 9999, font: "comic" },
      blocks: [{ type: "spacer", height: 5000 }, { type: "marquee" }, { type: "image", width: -3 }],
    })!;
    expect(d.settings.background).toBe("#f4f4f5");
    expect(d.settings.width).toBe(700);
    expect(d.settings.font).toBe("sans");
    expect(d.blocks.map((b) => b.type)).toEqual(["spacer", "image"]);
    expect(d.blocks[0]).toMatchObject({ height: 96 });
    expect(d.blocks[1]).toMatchObject({ width: 10 });
  });

  it("refuses input that is not a design", () => {
    expect(parseDesign(null)).toBeNull();
    expect(parseDesign({ blocks: "x" })).toBeNull();
  });
});

describe("renderDesign", () => {
  it("makes a full email document with every block", () => {
    const d = design(["header", "heading", "text", "button", "divider", "spacer", "footer"].map((t) => newBlock(t as never)));
    const html = renderDesign(d);
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("</body>");
    expect(html).toContain("Your brand");
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain("@media");
  });

  it("leaves out an image without a picture, but shows a box in the preview", () => {
    const d = design([{ type: "image", src: "" }]);
    expect(renderDesign(d)).not.toContain("<img");
    expect(renderDesign(d, { preview: true })).toContain("add a picture link");
    const withPicture = design([{ type: "image", src: "javascript:x", alt: "<b>" }]);
    expect(renderDesign(withPicture)).not.toContain("javascript:");
  });

  it("escapes the text of every block", () => {
    const d = design([
      { type: "heading", text: "<img src=x onerror=alert(1)>" },
      { type: "button", label: "</a><script>", href: "javascript:alert(1)" },
    ]);
    const html = renderDesign(d);
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<script>");
    expect(html).toContain('href="#"');
  });

  it("starts a blank design with a text and a footer", () => {
    expect(blankDesign().blocks.map((b) => b.type)).toEqual(["text", "footer"]);
  });
});

describe("blockIssue", () => {
  it("finds example links, bad links, and pictures without a link", () => {
    expect(blockIssue(newBlock("button"))).toMatch(/example\.com/);
    expect(blockIssue({ ...newBlock("button"), href: "javascript:x" } as never)).toMatch(/https/);
    expect(blockIssue({ ...newBlock("button"), href: "https://shop.test" } as never)).toBeNull();
    expect(blockIssue(newBlock("image"))).toMatch(/picture link/);
    expect(blockIssue(newBlock("divider"))).toBeNull();
    expect(blockIssue(newBlock("footer"))).toMatch(/sample address/);
    expect(blockIssue({ ...newBlock("footer"), text: "Acme · Main St 5 · Springfield" } as never)).toBeNull();
  });
});

describe("renderDesign preview", () => {
  it("marks the blocks only for the editor", () => {
    const d = design([{ type: "text", id: "t1", text: "Hi" }]);
    expect(renderDesign(d, { preview: true, selectable: true })).toContain('data-mf-block="t1"');
    expect(renderDesign(d, { preview: true })).not.toContain("data-mf");
    expect(renderDesign(d)).not.toContain("data-mf");
  });
});
