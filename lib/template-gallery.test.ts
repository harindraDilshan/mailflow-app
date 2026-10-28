import { describe, it, expect } from "vitest";
import { parseDesign, renderDesign } from "./email-design";
import { GALLERY_TEMPLATES, TEMPLATE_CATEGORIES, getGalleryTemplate } from "./template-gallery";

describe("gallery templates", () => {
  it("have unique IDs and known categories", () => {
    const ids = GALLERY_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    const categories = TEMPLATE_CATEGORIES.map((c) => c.id as string);
    for (const t of GALLERY_TEMPLATES) expect(categories).toContain(t.category);
  });

  it("are valid designs that render without changes", () => {
    for (const t of GALLERY_TEMPLATES) {
      expect(parseDesign(JSON.parse(JSON.stringify(t.design)))).toEqual(t.design);
      const html = renderDesign(t.design);
      expect(html).toContain("</html>");
      expect(html.length).toBeLessThan(60000);
    }
  });

  it("have a subject and stable block IDs", () => {
    for (const t of GALLERY_TEMPLATES) {
      expect(t.subject.length).toBeGreaterThan(0);
      expect(t.design.blocks[0].id).toBe(`${t.id}-0`);
    }
    expect(getGalleryTemplate("welcome")?.name).toBe("Welcome");
    expect(getGalleryTemplate("nope")).toBeNull();
  });
});
