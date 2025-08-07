import { ScopeAwareProvider } from "../src/scopeAwareProvider";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

describe("ScopeAwareProvider", () => {
  let provider: ScopeAwareProvider;
  let tempDir: string;

  beforeEach(() => {
    provider = new ScopeAwareProvider();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "liquid-ls-scope-test-"));
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("findScopedTranslationDefinition", () => {
    it("should find translation in current file before cursor line", () => {
      const mainFile = path.join(tempDir, "main.liquid");
      const mainContent = `
{% t= "early_translation" default:"Early" %}
{% t "early_translation" %}
{% t= "late_translation" default:"Late" %}
      `.trim();

      fs.writeFileSync(mainFile, mainContent);

      // Cursor at line 1 (0-based), should find early_translation but not late_translation
      const result = provider.findScopedTranslationDefinition(
        `file://${mainFile}`,
        "early_translation",
        1,
      );

      expect(result).not.toBeNull();
      expect(result?.filePath).toBe(mainFile);
      expect(result?.content).toContain("Early");
    });

    it("should not find translation defined after cursor line", () => {
      const mainFile = path.join(tempDir, "main.liquid");
      const mainContent = `
{% t "late_translation" %}
{% t= "late_translation" default:"Late" %}
      `.trim();

      fs.writeFileSync(mainFile, mainContent);

      // Cursor at line 0, should not find late_translation (defined at line 1)
      const result = provider.findScopedTranslationDefinition(
        `file://${mainFile}`,
        "late_translation",
        0,
      );

      expect(result).toBeNull();
    });

    it("should find translation in included file", () => {
      const mainFile = path.join(tempDir, "main.liquid");
      const translationsFile = path.join(
        tempDir,
        "text_parts",
        "translations.liquid",
      );

      // Create text_parts directory
      fs.mkdirSync(path.join(tempDir, "text_parts"));

      const mainContent = `
{% include "parts/translations" %}
{% t "included_translation" %}
      `.trim();

      const translationsContent = `
{% t= "included_translation" default:"Included" %}
      `.trim();

      fs.writeFileSync(mainFile, mainContent);
      fs.writeFileSync(translationsFile, translationsContent);

      // Cursor at line 1, should find translation from included file
      const result = provider.findScopedTranslationDefinition(
        `file://${mainFile}`,
        "included_translation",
        1,
      );

      expect(result).not.toBeNull();
      expect(result?.filePath).toBe(translationsFile);
      expect(result?.content).toContain("Included");
    });

    it("should respect include order and not find translations from files included after cursor", () => {
      const mainFile = path.join(tempDir, "main.liquid");
      const earlyFile = path.join(tempDir, "text_parts", "early.liquid");
      const lateFile = path.join(tempDir, "text_parts", "late.liquid");

      // Create text_parts directory
      fs.mkdirSync(path.join(tempDir, "text_parts"));

      const mainContent = `
{% include "parts/early" %}
{% t "test_translation" %}
{% include "parts/late" %}
      `.trim();

      const earlyContent = `
{% t= "test_translation" default:"Early Version" %}
      `.trim();

      const lateContent = `
{% t= "test_translation" default:"Late Version" %}
      `.trim();

      fs.writeFileSync(mainFile, mainContent);
      fs.writeFileSync(earlyFile, earlyContent);
      fs.writeFileSync(lateFile, lateContent);

      // Cursor at line 1, should find early version, not late version
      const result = provider.findScopedTranslationDefinition(
        `file://${mainFile}`,
        "test_translation",
        1,
      );

      expect(result).not.toBeNull();
      expect(result?.filePath).toBe(earlyFile);
      expect(result?.content).toContain("Early Version");
    });

    it("should prioritize current file over included files", () => {
      const mainFile = path.join(tempDir, "main.liquid");
      const translationsFile = path.join(
        tempDir,
        "text_parts",
        "translations.liquid",
      );

      // Create text_parts directory
      fs.mkdirSync(path.join(tempDir, "text_parts"));

      const mainContent = `
{% include "parts/translations" %}
{% t= "override_translation" default:"Main File Version" %}
{% t "override_translation" %}
      `.trim();

      const translationsContent = `
{% t= "override_translation" default:"Included File Version" %}
      `.trim();

      fs.writeFileSync(mainFile, mainContent);
      fs.writeFileSync(translationsFile, translationsContent);

      // Cursor at line 2, should find main file version (overrides included)
      const result = provider.findScopedTranslationDefinition(
        `file://${mainFile}`,
        "override_translation",
        2,
      );

      expect(result).not.toBeNull();
      expect(result?.filePath).toBe(mainFile);
      expect(result?.content).toContain("Main File Version");
    });

    it("should handle missing include files gracefully", () => {
      const mainFile = path.join(tempDir, "main.liquid");
      const mainContent = `
{% include "parts/nonexistent" %}
{% t "test_translation" %}
      `.trim();

      fs.writeFileSync(mainFile, mainContent);

      // Should not crash when include file doesn't exist
      const result = provider.findScopedTranslationDefinition(
        `file://${mainFile}`,
        "test_translation",
        1,
      );

      expect(result).toBeNull();
    });

    it("should handle nested includes from text parts", () => {
      const mainFile = path.join(tempDir, "main.liquid");
      const part1File = path.join(tempDir, "text_parts", "part1.liquid");
      const translationsFile = path.join(
        tempDir,
        "text_parts",
        "translations.liquid",
      );
      const configFile = path.join(tempDir, "config.json");

      // Create text_parts directory
      fs.mkdirSync(path.join(tempDir, "text_parts"));

      const mainContent = `
{% include "parts/part1" %}
      `.trim();

      const part1Content = `
{% include "parts/translations" %}
{% t "nested_translation" %}
      `.trim();

      const translationsContent = `
{% t= "nested_translation" default:"Nested Translation" %}
      `.trim();

      const config = {
        text_parts: {
          part1: "text_parts/part1.liquid",
          translations: "text_parts/translations.liquid",
        },
      };

      fs.writeFileSync(mainFile, mainContent);
      fs.writeFileSync(part1File, part1Content);
      fs.writeFileSync(translationsFile, translationsContent);
      fs.writeFileSync(configFile, JSON.stringify(config));

      // Cursor in part1.liquid at line 1, should find translation from nested include
      const result = provider.findScopedTranslationDefinition(
        `file://${part1File}`,
        "nested_translation",
        1,
      );

      expect(result).not.toBeNull();
      expect(result?.filePath).toBe(translationsFile);
      expect(result?.content).toContain("Nested Translation");
    });

    it("should resolve parts/ includes to text_parts/ directory", () => {
      const mainFile = path.join(tempDir, "main.liquid");
      const sharedFile = path.join(tempDir, "text_parts", "shared.liquid");
      const configFile = path.join(tempDir, "config.json");

      // Create text_parts directory (parts/ includes map to text_parts/)
      fs.mkdirSync(path.join(tempDir, "text_parts"));

      const mainContent = `
{% include "parts/shared" %}
{% t "shared_translation" %}
      `.trim();

      const sharedContent = `
{% t= "shared_translation" default:"Shared Translation" %}
      `.trim();

      const config = {
        text_parts: {
          shared: "text_parts/shared.liquid",
        },
      };

      fs.writeFileSync(mainFile, mainContent);
      fs.writeFileSync(sharedFile, sharedContent);
      fs.writeFileSync(configFile, JSON.stringify(config));

      // Cursor at line 1, should find translation from text_parts/ directory
      const result = provider.findScopedTranslationDefinition(
        `file://${mainFile}`,
        "shared_translation",
        1,
      );

      expect(result).not.toBeNull();
      expect(result?.filePath).toBe(sharedFile);
      expect(result?.content).toContain("Shared Translation");
    });

    it("should handle parts/ prefix mapping to text_parts/", () => {
      const mainFile = path.join(tempDir, "main.liquid");
      const utilsFile = path.join(tempDir, "text_parts", "utils.liquid");

      // Create text_parts directory (parts/ includes map to text_parts/)
      fs.mkdirSync(path.join(tempDir, "text_parts"));

      const mainContent = `
{% include "parts/utils" %}
{% t "utility_translation" %}
      `.trim();

      const utilsContent = `
{% t= "utility_translation" default:"Utility Translation" %}
      `.trim();

      fs.writeFileSync(mainFile, mainContent);
      fs.writeFileSync(utilsFile, utilsContent);

      // Cursor at line 1, should find translation from text_parts/utils.liquid
      const result = provider.findScopedTranslationDefinition(
        `file://${mainFile}`,
        "utility_translation",
        1,
      );

      expect(result).not.toBeNull();
      expect(result?.filePath).toBe(utilsFile);
      expect(result?.content).toContain("Utility Translation");
    });
  });

  describe("Shared Parts Integration", () => {
    const fixturesPath = path.join(__dirname, "..", "fixtures", "market-repo");

    it("should resolve shared/ includes to shared_parts directory", () => {
      const providerWithWorkspace = new ScopeAwareProvider(fixturesPath);

      // Test resolving shared/shared_part_1 from reconciliation_text_1
      const templateDir = path.join(
        fixturesPath,
        "reconciliation_texts",
        "reconciliation_text_1",
      );
      const resolvedPath = providerWithWorkspace.resolveIncludePath(
        "shared/shared_part_1",
        templateDir,
      );

      expect(resolvedPath).toBeDefined();
      expect(resolvedPath).toContain(
        "shared_parts/shared_part_1/shared_part_1.liquid",
      );
    });

    it("should validate shared part usage permissions", () => {
      const providerWithWorkspace = new ScopeAwareProvider(fixturesPath);

      // Test that shared_part_1 is allowed for reconciliation_text_1
      const rt1TemplateDir = path.join(
        fixturesPath,
        "reconciliation_texts",
        "reconciliation_text_1",
      );
      const resolvedPath1 = providerWithWorkspace.resolveIncludePath(
        "shared/shared_part_1",
        rt1TemplateDir,
      );
      expect(resolvedPath1).toBeDefined();

      // Test that shared_part_1 is NOT allowed for account_1
      const at1TemplateDir = path.join(
        fixturesPath,
        "account_templates",
        "account_1",
      );
      const resolvedPath2 = providerWithWorkspace.resolveIncludePath(
        "shared/shared_part_1",
        at1TemplateDir,
      );
      expect(resolvedPath2).toBeNull();
    });

    it("should find translations from included shared parts", () => {
      const providerWithWorkspace = new ScopeAwareProvider(fixturesPath);
      const rtMainFile = path.join(
        fixturesPath,
        "reconciliation_texts",
        "reconciliation_text_1",
        "main.liquid",
      );

      // Should find shared_translation_1 from shared_part_1 (included at line 1)
      const result = providerWithWorkspace.findScopedTranslationDefinition(
        `file://${rtMainFile}`,
        "shared_translation_1",
        5, // After the include
      );

      expect(result).not.toBeNull();
      expect(result?.filePath).toContain("shared_part_1.liquid");
      expect(result?.content).toContain("Shared Translation 1");
    });
  });
});
