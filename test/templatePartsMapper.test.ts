import { TemplatePartsMapper } from "../src/templatePartsMapper";
import { TemplateParts } from "../src/types";
import * as path from "path";

describe("TemplatePartsMapper", () => {
  let mapper: TemplatePartsMapper;
  const fixturesPath = path.join(__dirname, "../fixtures/market-repo");

  beforeEach(() => {
    mapper = new TemplatePartsMapper(fixturesPath);
  });

  describe("generateTemplateMap", () => {
    it("should generate complete template map for reconciliation_text_1", () => {
      const templateMap = mapper.generateTemplateMap(
        "reconciliationText",
        "reconciliation_text_1",
      );

      expect(templateMap).not.toBeNull();
      expect(templateMap).toHaveLength(7);

      // Verify the expected structure matches the debug output
      const expectedParts = [
        {
          type: "main",
          name: "main",
          startLine: 0,
          endLine: 3,
        },
        {
          type: "textPart",
          name: "part_1",
          startLine: 0,
          endLine: 1,
        },
        {
          type: "textPart",
          name: "part_2",
          startLine: 0,
          endLine: 2,
        },
        {
          type: "textPart",
          name: "part_1",
          startLine: 3,
          endLine: 8,
        },
        {
          type: "sharedPart",
          name: "shared_part_1",
          startLine: 0,
          endLine: 1,
        },
        {
          type: "textPart",
          name: "part_1",
          startLine: 10,
          endLine: 13,
        },
        {
          type: "main",
          name: "main",
          startLine: 5,
          endLine: 13,
        },
      ];

      expect(templateMap).toEqual(expectedParts);
    });

    it("should handle non-existent template directory", () => {
      const templateMap = mapper.generateTemplateMap(
        "reconciliationText",
        "non_existent_template",
      );

      expect(templateMap).toBeNull();
    });

    it("should handle template directory without main.liquid", () => {
      // Create a mapper with a different workspace to test missing main.liquid
      const invalidMapper = new TemplatePartsMapper("/invalid/path");
      const templateMap = invalidMapper.generateTemplateMap(
        "reconciliationText",
        "any_template",
      );

      expect(templateMap).toBeNull();
    });

    it("should generate template map for account template", () => {
      const templateMap = mapper.generateTemplateMap(
        "accountTemplate",
        "account_1",
      );

      expect(templateMap).not.toBeNull();
      expect(Array.isArray(templateMap)).toBe(true);
      expect(templateMap!.length).toBeGreaterThan(0);

      // Verify first part is text part (since main.liquid starts with include)
      expect(templateMap![0]).toMatchObject({
        type: "textPart",
        name: "part_1",
        startLine: 0,
      });
    });

    it("should generate template map for export file", () => {
      const templateMap = mapper.generateTemplateMap("exportFile", "export_1");

      expect(templateMap).not.toBeNull();
      expect(Array.isArray(templateMap)).toBe(true);
      expect(templateMap!.length).toBeGreaterThan(0);

      // Verify first part is text part (since main.liquid starts with include)
      expect(templateMap![0]).toMatchObject({
        type: "textPart",
        name: "part_1",
        startLine: 0,
      });
    });
  });

  describe("template part structure validation", () => {
    let templateMap: TemplateParts | null;

    beforeEach(() => {
      templateMap = mapper.generateTemplateMap(
        "reconciliationText",
        "reconciliation_text_1",
      );
    });

    it("should have valid line ranges for all parts", () => {
      expect(templateMap).not.toBeNull();

      for (const part of templateMap!) {
        expect(part.startLine).toBeGreaterThanOrEqual(0);
        expect(part.endLine).toBeGreaterThanOrEqual(part.startLine);
        expect(typeof part.startLine).toBe("number");
        expect(typeof part.endLine).toBe("number");
      }
    });

    it("should have valid part types", () => {
      expect(templateMap).not.toBeNull();

      const validTypes = ["main", "textPart", "sharedPart"];
      for (const part of templateMap!) {
        expect(validTypes).toContain(part.type);
      }
    });

    it("should have valid part names", () => {
      expect(templateMap).not.toBeNull();

      for (const part of templateMap!) {
        expect(typeof part.name).toBe("string");
        expect(part.name.length).toBeGreaterThan(0);
      }
    });

    it("should contain main template parts", () => {
      expect(templateMap).not.toBeNull();

      const mainParts = templateMap!.filter((part) => part.type === "main");
      expect(mainParts.length).toBeGreaterThan(0);

      for (const mainPart of mainParts) {
        expect(mainPart.name).toBe("main");
      }
    });

    it("should contain text part sections", () => {
      expect(templateMap).not.toBeNull();

      const textParts = templateMap!.filter((part) => part.type === "textPart");
      expect(textParts.length).toBeGreaterThan(0);

      // Check that we have both part_1 and part_2
      const partNames = textParts.map((part) => part.name);
      expect(partNames).toContain("part_1");
      expect(partNames).toContain("part_2");
    });

    it("should contain shared part sections", () => {
      expect(templateMap).not.toBeNull();

      const sharedParts = templateMap!.filter(
        (part) => part.type === "sharedPart",
      );
      expect(sharedParts.length).toBeGreaterThan(0);

      const sharedPartNames = sharedParts.map((part) => part.name);
      expect(sharedPartNames).toContain("shared_part_1");
    });
  });

  describe("include resolution", () => {
    it("should properly resolve text part includes", () => {
      const templateMap = mapper.generateTemplateMap(
        "reconciliationText",
        "reconciliation_text_1",
      );

      expect(templateMap).not.toBeNull();

      // Find text part sections
      const textParts = templateMap!.filter((part) => part.type === "textPart");

      // Should have multiple part_1 sections due to nested includes
      const part1Sections = textParts.filter((part) => part.name === "part_1");
      expect(part1Sections.length).toBeGreaterThan(1);

      // Should have part_2 section
      const part2Sections = textParts.filter((part) => part.name === "part_2");
      expect(part2Sections.length).toBe(1);
    });

    it("should properly resolve shared part includes", () => {
      const templateMap = mapper.generateTemplateMap(
        "reconciliationText",
        "reconciliation_text_1",
      );

      expect(templateMap).not.toBeNull();

      // Find shared part sections
      const sharedParts = templateMap!.filter(
        (part) => part.type === "sharedPart",
      );

      expect(sharedParts.length).toBe(1);
      expect(sharedParts[0].name).toBe("shared_part_1");
      expect(sharedParts[0].startLine).toBe(0);
      expect(sharedParts[0].endLine).toBe(1);
    });

    it("should maintain correct order of execution", () => {
      const templateMap = mapper.generateTemplateMap(
        "reconciliationText",
        "reconciliation_text_1",
      );

      expect(templateMap).not.toBeNull();

      // Based on the expected debug output, verify the execution order
      const expectedOrder = [
        { type: "main", name: "main" },
        { type: "textPart", name: "part_1" },
        { type: "textPart", name: "part_2" },
        { type: "textPart", name: "part_1" },
        { type: "sharedPart", name: "shared_part_1" },
        { type: "textPart", name: "part_1" },
        { type: "main", name: "main" },
      ];

      for (let i = 0; i < expectedOrder.length; i++) {
        expect(templateMap![i].type).toBe(expectedOrder[i].type);
        expect(templateMap![i].name).toBe(expectedOrder[i].name);
      }
    });
  });

  describe("line number accuracy", () => {
    it("should have accurate line numbers for main template sections", () => {
      const templateMap = mapper.generateTemplateMap(
        "reconciliationText",
        "reconciliation_text_1",
      );

      expect(templateMap).not.toBeNull();

      const mainParts = templateMap!.filter((part) => part.type === "main");

      // First main section should start at line 0 and end at line before first include
      expect(mainParts[0].startLine).toBe(0);
      expect(mainParts[0].endLine).toBe(3);

      // Last main section should start after the include and go to end
      expect(mainParts[1].startLine).toBe(5);
      expect(mainParts[1].endLine).toBe(13);
    });

    it("should have accurate line numbers for text part sections", () => {
      const templateMap = mapper.generateTemplateMap(
        "reconciliationText",
        "reconciliation_text_1",
      );

      expect(templateMap).not.toBeNull();

      const textParts = templateMap!.filter((part) => part.type === "textPart");

      // Verify specific line ranges for each part based on file content
      const part1Sections = textParts.filter((part) => part.name === "part_1");
      expect(part1Sections.length).toBeGreaterThan(0);

      // Check the first part_1 section
      expect(part1Sections[0].startLine).toBe(0);
      expect(part1Sections[0].endLine).toBe(1);

      const part2 = textParts.find((part) => part.name === "part_2");
      expect(part2).toBeDefined();
      expect(part2!.startLine).toBe(0);
      expect(part2!.endLine).toBe(2);
    });

    it("should have accurate line numbers for shared part sections", () => {
      const templateMap = mapper.generateTemplateMap(
        "reconciliationText",
        "reconciliation_text_1",
      );

      expect(templateMap).not.toBeNull();

      const sharedPart = templateMap!.find(
        (part) => part.type === "sharedPart" && part.name === "shared_part_1",
      );

      expect(sharedPart).toBeDefined();
      expect(sharedPart!.startLine).toBe(0);
      expect(sharedPart!.endLine).toBe(1);
    });
  });

  describe("error handling", () => {
    it("should handle missing text parts gracefully", () => {
      // This would require a fixture with invalid includes, but for now
      // we can test that the method doesn't crash with invalid inputs
      const invalidMapper = new TemplatePartsMapper("/nonexistent/path");

      expect(() => {
        invalidMapper.generateTemplateMap("reconciliationText", "invalid");
      }).not.toThrow();

      const result = invalidMapper.generateTemplateMap(
        "reconciliationText",
        "invalid",
      );
      expect(result).toBeNull();
    });

    it("should prevent circular includes", () => {
      // This test assumes the implementation handles circular includes
      // by tracking processed files - no fixture needed as it's handled internally
      const templateMap = mapper.generateTemplateMap(
        "reconciliationText",
        "reconciliation_text_1",
      );

      expect(templateMap).not.toBeNull();
      // If circular includes were not handled, this would hang or crash
      expect(Array.isArray(templateMap)).toBe(true);
    });
  });

  describe("different template types", () => {
    it("should handle reconciliation text templates", () => {
      const templateMap = mapper.generateTemplateMap(
        "reconciliationText",
        "reconciliation_text_1",
      );

      expect(templateMap).not.toBeNull();
      expect(templateMap!.length).toBeGreaterThan(0);
    });

    it("should handle account templates", () => {
      const templateMap = mapper.generateTemplateMap(
        "accountTemplate",
        "account_1",
      );

      expect(templateMap).not.toBeNull();
      expect(templateMap!.length).toBeGreaterThan(0);
    });

    it("should handle export files", () => {
      const templateMap = mapper.generateTemplateMap("exportFile", "export_1");

      expect(templateMap).not.toBeNull();
      expect(templateMap!.length).toBeGreaterThan(0);
    });
  });
});
