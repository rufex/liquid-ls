import { DocumentationProvider } from "../src/documentationProvider";
import * as path from "path";

describe("DocumentationProvider", () => {
  let provider: DocumentationProvider;
  const workspaceRoot = path.join(__dirname, "..");

  beforeEach(() => {
    provider = new DocumentationProvider(workspaceRoot);
  });

  describe("getTagHoverContent", () => {
    it("should return markdown content for tags with documentation", () => {
      const result = provider.getTagHoverContent("assign");

      expect(result).not.toBeNull();
      expect(typeof result).toBe("string");
      // Should return the actual markdown content from assign.md
      expect(result).toContain("assign");
    });

    it("should return null for empty documentation files", () => {
      const result = provider.getTagHoverContent("capture");

      // capture.md exists but is empty, should return null
      expect(result).toBeNull();
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
});
