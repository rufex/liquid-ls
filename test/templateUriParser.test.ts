import { parseTemplateUri, isTemplateUri } from "../src/utils/templateUriParser";
import { TemplateTypes, TemplatePartType, TemplateUriInfo } from "../src/types";

describe("templateUriParser", () => {
  describe("parseTemplateUri", () => {
    describe("main template files", () => {
      it("should parse reconciliationText main template URI", () => {
        const uri = "file:///workspace/reconciliation_texts/my_template/main.liquid";
        const result = parseTemplateUri(uri);

        expect(result).toEqual({
          templateType: "reconciliationText",
          templateName: "my_template",
          partType: "main",
          partName: "main",
          fullPath: "/workspace/reconciliation_texts/my_template/main.liquid"
        });
      });

      it("should parse accountTemplate main template URI", () => {
        const uri = "file:///workspace/account_templates/invoice_template/main.liquid";
        const result = parseTemplateUri(uri);

        expect(result).toEqual({
          templateType: "accountTemplate",
          templateName: "invoice_template",
          partType: "main",
          partName: "main",
          fullPath: "/workspace/account_templates/invoice_template/main.liquid"
        });
      });

      it("should parse exportFile main template URI", () => {
        const uri = "file:///workspace/export_files/data_export/main.liquid";
        const result = parseTemplateUri(uri);

        expect(result).toEqual({
          templateType: "exportFile",
          templateName: "data_export",
          partType: "main",
          partName: "main",
          fullPath: "/workspace/export_files/data_export/main.liquid"
        });
      });
    });

    describe("text part files", () => {
      it("should parse reconciliationText text part URI", () => {
        const uri = "file:///workspace/reconciliation_texts/my_template/text_parts/greeting.liquid";
        const result = parseTemplateUri(uri);

        expect(result).toEqual({
          templateType: "reconciliationText",
          templateName: "my_template",
          partType: "textPart",
          partName: "greeting",
          fullPath: "/workspace/reconciliation_texts/my_template/text_parts/greeting.liquid"
        });
      });

      it("should parse accountTemplate text part URI", () => {
        const uri = "file:///workspace/account_templates/invoice_template/text_parts/header.liquid";
        const result = parseTemplateUri(uri);

        expect(result).toEqual({
          templateType: "accountTemplate",
          templateName: "invoice_template",
          partType: "textPart",
          partName: "header",
          fullPath: "/workspace/account_templates/invoice_template/text_parts/header.liquid"
        });
      });

      it("should handle text parts with underscores in names", () => {
        const uri = "file:///workspace/reconciliation_texts/my_template/text_parts/multi_word_part.liquid";
        const result = parseTemplateUri(uri);

        expect(result).toEqual({
          templateType: "reconciliationText",
          templateName: "my_template",
          partType: "textPart",
          partName: "multi_word_part",
          fullPath: "/workspace/reconciliation_texts/my_template/text_parts/multi_word_part.liquid"
        });
      });
    });

    describe("shared part files", () => {
      it("should parse shared part URI", () => {
        const uri = "file:///workspace/shared_parts/footer/footer.liquid";
        const result = parseTemplateUri(uri);

        expect(result).toEqual({
          templateType: "sharedPart",
          templateName: "footer",
          partType: "sharedPart",
          partName: "footer",
          fullPath: "/workspace/shared_parts/footer/footer.liquid"
        });
      });

      it("should parse shared part with underscore in name", () => {
        const uri = "file:///workspace/shared_parts/common_header/common_header.liquid";
        const result = parseTemplateUri(uri);

        expect(result).toEqual({
          templateType: "sharedPart",
          templateName: "common_header",
          partType: "sharedPart",
          partName: "common_header",
          fullPath: "/workspace/shared_parts/common_header/common_header.liquid"
        });
      });

      it("should reject malformed shared part URI (wrong file name)", () => {
        const uri = "file:///workspace/shared_parts/footer/wrong_name.liquid";
        const result = parseTemplateUri(uri);

        expect(result).toBeNull();
      });
    });

    describe("nested directory paths", () => {
      it("should handle deeply nested workspace paths", () => {
        const uri = "file:///home/user/projects/workspace/reconciliation_texts/my_template/main.liquid";
        const result = parseTemplateUri(uri);

        expect(result).toEqual({
          templateType: "reconciliationText",
          templateName: "my_template",
          partType: "main",
          partName: "main",
          fullPath: "/home/user/projects/workspace/reconciliation_texts/my_template/main.liquid"
        });
      });

      it("should handle Windows-style paths", () => {
        const uri = "file:///C:/workspace/reconciliation_texts/my_template/main.liquid";
        const result = parseTemplateUri(uri);

        expect(result).toEqual({
          templateType: "reconciliationText",
          templateName: "my_template",
          partType: "main",
          partName: "main",
          fullPath: "c:/workspace/reconciliation_texts/my_template/main.liquid" // vscode-uri normalizes to lowercase
        });
      });
    });

    describe("invalid URIs", () => {
      it("should return null for non-liquid files", () => {
        const uri = "file:///workspace/reconciliation_texts/my_template/main.txt";
        const result = parseTemplateUri(uri);

        expect(result).toBeNull();
      });

      it("should return null for files outside template directories", () => {
        const uri = "file:///workspace/other_folder/file.liquid";
        const result = parseTemplateUri(uri);

        expect(result).toBeNull();
      });

      it("should return null for invalid template directory structure", () => {
        const uri = "file:///workspace/reconciliation_texts/main.liquid";
        const result = parseTemplateUri(uri);

        expect(result).toBeNull();
      });

      it("should return null for malformed URIs", () => {
        const invalidUri = "not-a-uri";
        const result = parseTemplateUri(invalidUri);

        expect(result).toBeNull();
      });

      it("should return null for empty string", () => {
        const result = parseTemplateUri("");

        expect(result).toBeNull();
      });

      it("should return null for URIs without file extension", () => {
        const uri = "file:///workspace/reconciliation_texts/my_template/main";
        const result = parseTemplateUri(uri);

        expect(result).toBeNull();
      });
    });

    describe("edge cases", () => {
      it("should handle template names with numbers", () => {
        const uri = "file:///workspace/reconciliation_texts/template_123/main.liquid";
        const result = parseTemplateUri(uri);

        expect(result).toEqual({
          templateType: "reconciliationText",
          templateName: "template_123",
          partType: "main",
          partName: "main",
          fullPath: "/workspace/reconciliation_texts/template_123/main.liquid"
        });
      });

      it("should handle template names with hyphens", () => {
        const uri = "file:///workspace/reconciliation_texts/my-template/main.liquid";
        const result = parseTemplateUri(uri);

        expect(result).toEqual({
          templateType: "reconciliationText",
          templateName: "my-template",
          partType: "main",
          partName: "main",
          fullPath: "/workspace/reconciliation_texts/my-template/main.liquid"
        });
      });

      it("should handle very long template names", () => {
        const longName = "very_long_template_name_with_many_parts_and_descriptive_text";
        const uri = `file:///workspace/reconciliation_texts/${longName}/main.liquid`;
        const result = parseTemplateUri(uri);

        expect(result).toEqual({
          templateType: "reconciliationText",
          templateName: longName,
          partType: "main",
          partName: "main",
          fullPath: `/workspace/reconciliation_texts/${longName}/main.liquid`
        });
      });
    });

    describe("all template types", () => {
      const templateTypes = [
        { type: "reconciliationText" as TemplateTypes, dir: "reconciliation_texts" },
        { type: "accountTemplate" as TemplateTypes, dir: "account_templates" },
        { type: "exportFile" as TemplateTypes, dir: "export_files" },
      ];

      templateTypes.forEach(({ type, dir }) => {
        it(`should parse ${type} template type`, () => {
          const uri = `file:///workspace/${dir}/test_template/main.liquid`;
          const result = parseTemplateUri(uri);

          expect(result).toEqual({
            templateType: type,
            templateName: "test_template",
            partType: "main",
            partName: "main",
            fullPath: `/workspace/${dir}/test_template/main.liquid`
          });
        });
      });
    });
  });

  describe("isTemplateUri", () => {
    it("should return true for valid template URIs", () => {
      const validUris = [
        "file:///workspace/reconciliation_texts/template/main.liquid",
        "file:///workspace/shared_parts/footer/footer.liquid",
        "file:///workspace/account_templates/invoice/text_parts/header.liquid",
      ];

      validUris.forEach(uri => {
        expect(isTemplateUri(uri)).toBe(true);
      });
    });

    it("should return false for invalid template URIs", () => {
      const invalidUris = [
        "file:///workspace/other/file.liquid",
        "file:///workspace/reconciliation_texts/template/main.txt",
        "not-a-uri",
        "",
      ];

      invalidUris.forEach(uri => {
        expect(isTemplateUri(uri)).toBe(false);
      });
    });
  });

  describe("type safety", () => {
    it("should return properly typed TemplateUriInfo", () => {
      const uri = "file:///workspace/reconciliation_texts/my_template/main.liquid";
      const result: TemplateUriInfo | null = parseTemplateUri(uri);

      if (result) {
        // TypeScript should infer these types correctly
        const templateType: TemplateTypes = result.templateType;
        const partType: TemplatePartType = result.partType;
        const templateName: string = result.templateName;
        const partName: string = result.partName;
        const fullPath: string = result.fullPath;

        expect(typeof templateType).toBe("string");
        expect(typeof partType).toBe("string");
        expect(typeof templateName).toBe("string");
        expect(typeof partName).toBe("string");
        expect(typeof fullPath).toBe("string");
      }
    });
  });
});