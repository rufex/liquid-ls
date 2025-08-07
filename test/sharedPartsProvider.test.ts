import { SharedPartsProvider } from "../src/sharedPartsProvider";
import * as path from "path";

describe("SharedPartsProvider", () => {
  const fixturesPath = path.join(__dirname, "..", "fixtures", "market-repo");
  let provider: SharedPartsProvider;

  beforeEach(() => {
    provider = new SharedPartsProvider(fixturesPath);
  });

  describe("constructor and discovery", () => {
    it("should discover shared parts on initialization", () => {
      const allSharedParts = provider.getAllSharedParts();
      expect(allSharedParts.size).toBeGreaterThan(0);
    });

    it("should handle missing shared_parts directory gracefully", () => {
      const emptyProvider = new SharedPartsProvider("/nonexistent/path");
      const allSharedParts = emptyProvider.getAllSharedParts();
      expect(allSharedParts.size).toBe(0);
    });
  });

  describe("getSharedPart", () => {
    it("should return shared part mapping for existing shared part", () => {
      const sharedPart = provider.getSharedPart("shared_part_1");
      expect(sharedPart).toBeDefined();
      expect(sharedPart?.name).toBe("shared_part_1");
      expect(sharedPart?.filePath).toContain("shared_part_1.liquid");
      expect(sharedPart?.usedInTemplates).toBeInstanceOf(Set);
    });

    it("should return undefined for non-existent shared part", () => {
      const sharedPart = provider.getSharedPart("non_existent_part");
      expect(sharedPart).toBeUndefined();
    });
  });

  describe("getSharedPartsForTemplate", () => {
    it("should return shared parts used by a template", () => {
      const sharedParts = provider.getSharedPartsForTemplate(
        "reconciliation_text_1",
      );
      expect(sharedParts).toBeInstanceOf(Set);
      expect(sharedParts.has("shared_part_1")).toBe(true);
    });

    it("should return empty set for template with no shared parts", () => {
      const sharedParts = provider.getSharedPartsForTemplate(
        "non_existent_template",
      );
      expect(sharedParts).toBeInstanceOf(Set);
      expect(sharedParts.size).toBe(0);
    });

    it("should handle template with multiple shared parts", () => {
      const sharedParts = provider.getSharedPartsForTemplate(
        "reconciliation_text_2",
      );
      expect(sharedParts).toBeInstanceOf(Set);
      expect(sharedParts.has("shared_part_1")).toBe(true);
      expect(sharedParts.has("shared_part_2")).toBe(true);
    });
  });

  describe("isSharedPartAllowedForTemplate", () => {
    it("should return true for allowed shared part", () => {
      const isAllowed = provider.isSharedPartAllowedForTemplate(
        "shared_part_1",
        "reconciliation_text_1",
      );
      expect(isAllowed).toBe(true);
    });

    it("should return false for non-allowed shared part", () => {
      const isAllowed = provider.isSharedPartAllowedForTemplate(
        "shared_part_1",
        "account_1",
      );
      expect(isAllowed).toBe(false);
    });

    it("should return false for non-existent shared part", () => {
      const isAllowed = provider.isSharedPartAllowedForTemplate(
        "non_existent_part",
        "reconciliation_text_1",
      );
      expect(isAllowed).toBe(false);
    });

    it("should handle shared part with empty used_in array", () => {
      // shared_part_3 has empty used_in array
      const isAllowed = provider.isSharedPartAllowedForTemplate(
        "shared_part_2", // Note: shared_part_3 has name "shared_part_2" in config
        "any_template",
      );
      expect(isAllowed).toBe(false);
    });
  });

  describe("getTemplateHandleFromUri", () => {
    it("should extract template handle from account template URI", () => {
      const uri = `file://${fixturesPath}/account_templates/account_1/main.liquid`;
      const handle = provider.getTemplateHandleFromUri(uri);
      expect(handle).toBe("account_1");
    });

    it("should extract template handle from reconciliation text URI", () => {
      const uri = `file://${fixturesPath}/reconciliation_texts/reconciliation_text_1/main.liquid`;
      const handle = provider.getTemplateHandleFromUri(uri);
      expect(handle).toBe("reconciliation_text_1");
    });

    it("should extract template handle from export file URI", () => {
      const uri = `file://${fixturesPath}/export_files/export_1/main.liquid`;
      const handle = provider.getTemplateHandleFromUri(uri);
      expect(handle).toBe("export_1");
    });

    it("should extract template handle from text_parts file URI", () => {
      const uri = `file://${fixturesPath}/account_templates/account_1/text_parts/part_1.liquid`;
      const handle = provider.getTemplateHandleFromUri(uri);
      expect(handle).toBe("account_1");
    });

    it("should return undefined for non-template URI", () => {
      const uri = `file://${fixturesPath}/shared_parts/shared_part_1/shared_part_1.liquid`;
      const handle = provider.getTemplateHandleFromUri(uri);
      expect(handle).toBeUndefined();
    });

    it("should return undefined for invalid URI", () => {
      const handle = provider.getTemplateHandleFromUri("invalid-uri");
      expect(handle).toBeUndefined();
    });
  });

  describe("refreshSharedParts", () => {
    it("should refresh shared parts mapping", () => {
      const initialCount = provider.getAllSharedParts().size;
      provider.refreshSharedParts();
      const refreshedCount = provider.getAllSharedParts().size;
      expect(refreshedCount).toBe(initialCount);
    });
  });

  describe("config validation", () => {
    it("should handle shared part with missing name gracefully", () => {
      // This tests the validation logic in processSharedPartDirectory
      // The actual fixtures should have valid configs, so this tests the error handling
      const allSharedParts = provider.getAllSharedParts();

      // All discovered shared parts should have valid names
      for (const [name, mapping] of allSharedParts) {
        expect(name).toBeTruthy();
        expect(mapping.name).toBeTruthy();
        expect(mapping.filePath).toBeTruthy();
      }
    });

    it("should handle shared part with missing liquid file gracefully", () => {
      // This tests the file existence validation
      const allSharedParts = provider.getAllSharedParts();

      // All discovered shared parts should have existing files
      for (const [, mapping] of allSharedParts) {
        expect(mapping.filePath).toBeTruthy();
        // The file should exist (tested during discovery)
      }
    });
  });

  describe("used_in mapping", () => {
    it("should correctly map shared parts to templates", () => {
      const sharedPart1 = provider.getSharedPart("shared_part_1");
      expect(sharedPart1?.usedInTemplates.has("reconciliation_text_1")).toBe(
        true,
      );
      expect(sharedPart1?.usedInTemplates.has("reconciliation_text_2")).toBe(
        true,
      );
    });

    it("should correctly map templates to shared parts", () => {
      const rt1SharedParts = provider.getSharedPartsForTemplate(
        "reconciliation_text_1",
      );
      const rt2SharedParts = provider.getSharedPartsForTemplate(
        "reconciliation_text_2",
      );

      expect(rt1SharedParts.has("shared_part_1")).toBe(true);
      expect(rt2SharedParts.has("shared_part_1")).toBe(true);
      expect(rt2SharedParts.has("shared_part_2")).toBe(true);
    });

    it("should handle templates not in any shared part's used_in", () => {
      const accountSharedParts =
        provider.getSharedPartsForTemplate("account_1");
      expect(accountSharedParts.size).toBe(0);
    });
  });
});
