import { TagDocumentationProvider } from "../src/tagDocumentationProvider";

describe("TagDocumentationProvider", () => {
  let provider: TagDocumentationProvider;

  beforeEach(() => {
    provider = new TagDocumentationProvider();
  });

  describe("getTagDocumentation", () => {
    it("should return documentation for known tag 'unreconciled'", () => {
      const result = provider.getTagDocumentation("unreconciled");

      expect(result).not.toBeNull();
      expect(result?.tagName).toBe("unreconciled");
      expect(result?.documentationUrl).toBe(
        "https://developer.silverfin.com/docs/unreconciled",
      );
    });

    it("should return documentation for known tag 'result'", () => {
      const result = provider.getTagDocumentation("result");

      expect(result).not.toBeNull();
      expect(result?.tagName).toBe("result");
      expect(result?.documentationUrl).toBe(
        "https://developer.silverfin.com/docs/result",
      );
    });

    it("should return null for unknown tag", () => {
      const result = provider.getTagDocumentation("unknown_tag");
      expect(result).toBeNull();
    });

    it("should return null for empty string", () => {
      const result = provider.getTagDocumentation("");
      expect(result).toBeNull();
    });

    it("should be case-sensitive", () => {
      const result = provider.getTagDocumentation("UNRECONCILED");
      expect(result).toBeNull();
    });
  });

  describe("hasDocumentation", () => {
    it("should return true for known tags", () => {
      expect(provider.hasDocumentation("unreconciled")).toBe(true);
      expect(provider.hasDocumentation("result")).toBe(true);
    });

    it("should return false for unknown tags", () => {
      expect(provider.hasDocumentation("unknown_tag")).toBe(false);
      expect(provider.hasDocumentation("")).toBe(false);
    });

    it("should be case-sensitive", () => {
      expect(provider.hasDocumentation("UNRECONCILED")).toBe(false);
      expect(provider.hasDocumentation("Result")).toBe(false);
    });
  });

  describe("getKnownTags", () => {
    it("should return all registered tag names", () => {
      const knownTags = provider.getKnownTags();

      expect(knownTags).toContain("unreconciled");
      expect(knownTags).toContain("result");
      expect(knownTags).toContain("assign");
      expect(knownTags).toContain("capture");
      expect(knownTags.length).toBe(4);
    });

    it("should return array of strings", () => {
      const knownTags = provider.getKnownTags();
      expect(Array.isArray(knownTags)).toBe(true);
      knownTags.forEach((tag) => {
        expect(typeof tag).toBe("string");
      });
    });
  });

  describe("formatTagHover", () => {
    it("should format hover content correctly", () => {
      const result = provider.formatTagHover(
        "test_tag",
        "https://example.com/test",
      );

      const expected =
        "**Tag:** `test_tag`\n\n**Documentation:** [https://example.com/test](https://example.com/test)";
      expect(result).toBe(expected);
    });

    it("should handle special characters in tag name", () => {
      const result = provider.formatTagHover(
        "tag_with_underscores",
        "https://example.com",
      );

      const expected =
        "**Tag:** `tag_with_underscores`\n\n**Documentation:** [https://example.com](https://example.com)";
      expect(result).toBe(expected);
    });

    it("should handle long URLs", () => {
      const longUrl =
        "https://developer.silverfin.com/docs/very/long/path/to/documentation";
      const result = provider.formatTagHover("tag", longUrl);

      const expected = `**Tag:** \`tag\`\n\n**Documentation:** [${longUrl}](${longUrl})`;
      expect(result).toBe(expected);
    });
  });

  describe("getTagHoverContent", () => {
    it("should return formatted hover content for known tags", () => {
      const result = provider.getTagHoverContent("unreconciled");

      expect(result).not.toBeNull();
      expect(result).toContain("**Tag:** `unreconciled`");
      expect(result).toContain("**Documentation:**");
      expect(result).toContain(
        "https://developer.silverfin.com/docs/unreconciled",
      );
      expect(result).toMatch(
        /\[https:\/\/developer\.silverfin\.com\/docs\/unreconciled\]\(https:\/\/developer\.silverfin\.com\/docs\/unreconciled\)/,
      );
    });

    it("should return formatted hover content for result tag", () => {
      const result = provider.getTagHoverContent("result");

      expect(result).not.toBeNull();
      expect(result).toContain("**Tag:** `result`");
      expect(result).toContain("**Documentation:**");
      expect(result).toContain("https://developer.silverfin.com/docs/result");
      expect(result).toMatch(
        /\[https:\/\/developer\.silverfin\.com\/docs\/result\]\(https:\/\/developer\.silverfin\.com\/docs\/result\)/,
      );
    });

    it("should return null for unknown tags", () => {
      const result = provider.getTagHoverContent("unknown_tag");
      expect(result).toBeNull();
    });

    it("should return null for empty string", () => {
      const result = provider.getTagHoverContent("");
      expect(result).toBeNull();
    });
  });

  describe("initialization", () => {
    it("should initialize with correct number of known tags", () => {
      const knownTags = provider.getKnownTags();
      expect(knownTags.length).toBe(4);
    });

    it("should have all required tags registered", () => {
      expect(provider.hasDocumentation("unreconciled")).toBe(true);
      expect(provider.hasDocumentation("result")).toBe(true);
      expect(provider.hasDocumentation("assign")).toBe(true);
      expect(provider.hasDocumentation("capture")).toBe(true);
    });

    it("should maintain correct URLs for all tags", () => {
      const unreconciledDoc = provider.getTagDocumentation("unreconciled");
      const resultDoc = provider.getTagDocumentation("result");
      const assignDoc = provider.getTagDocumentation("assign");
      const captureDoc = provider.getTagDocumentation("capture");

      expect(unreconciledDoc?.documentationUrl).toBe(
        "https://developer.silverfin.com/docs/unreconciled",
      );
      expect(resultDoc?.documentationUrl).toBe(
        "https://developer.silverfin.com/docs/result",
      );
      expect(assignDoc?.documentationUrl).toBe(
        "https://developer.silverfin.com/docs/variables#assign",
      );
      expect(captureDoc?.documentationUrl).toBe(
        "https://developer.silverfin.com/docs/variables#capture",
      );
    });
  });

  describe("integration behavior", () => {
    it("should maintain consistency between hasDocumentation and getTagDocumentation", () => {
      const testTags = ["unreconciled", "result", "unknown_tag", ""];

      testTags.forEach((tag) => {
        const hasDoc = provider.hasDocumentation(tag);
        const doc = provider.getTagDocumentation(tag);

        if (hasDoc) {
          expect(doc).not.toBeNull();
        } else {
          expect(doc).toBeNull();
        }
      });
    });

    it("should maintain consistency between getTagDocumentation and getTagHoverContent", () => {
      const testTags = ["unreconciled", "result", "unknown_tag"];

      testTags.forEach((tag) => {
        const doc = provider.getTagDocumentation(tag);
        const hoverContent = provider.getTagHoverContent(tag);

        if (doc) {
          expect(hoverContent).not.toBeNull();
          expect(hoverContent).toContain(doc.tagName);
          expect(hoverContent).toContain(doc.documentationUrl);
        } else {
          expect(hoverContent).toBeNull();
        }
      });
    });
  });
});
