import {
  RelatedFilesProvider,
  TemplateConfig,
} from "../src/relatedFilesProvider";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

describe("RelatedFilesProvider", () => {
  let provider: RelatedFilesProvider;
  let tempDir: string;

  beforeEach(() => {
    provider = new RelatedFilesProvider();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "liquid-ls-test-"));
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("getRelatedFiles", () => {
    it("should return only main file when no config.json exists", () => {
      const mainFile = path.join(tempDir, "template.liquid");
      fs.writeFileSync(mainFile, "{% t 'test' %}");

      const result = provider.getRelatedFiles(`file://${mainFile}`);

      expect(result).toEqual({
        mainFile: mainFile,
        textParts: [],
        allFiles: [mainFile],
      });
    });

    it("should return only main file when config.json has no text_parts", () => {
      const mainFile = path.join(tempDir, "template.liquid");
      const configFile = path.join(tempDir, "config.json");

      fs.writeFileSync(mainFile, "{% t 'test' %}");
      fs.writeFileSync(configFile, JSON.stringify({ other_property: "value" }));

      const result = provider.getRelatedFiles(`file://${mainFile}`);

      expect(result).toEqual({
        mainFile: mainFile,
        textParts: [],
        allFiles: [mainFile],
      });
    });

    it("should return only main file when text_parts is not an array", () => {
      const mainFile = path.join(tempDir, "template.liquid");
      const configFile = path.join(tempDir, "config.json");

      fs.writeFileSync(mainFile, "{% t 'test' %}");
      fs.writeFileSync(
        configFile,
        JSON.stringify({ text_parts: "not_an_array" }),
      );

      const result = provider.getRelatedFiles(`file://${mainFile}`);

      expect(result).toEqual({
        mainFile: mainFile,
        textParts: [],
        allFiles: [mainFile],
      });
    });

    it("should return main file and existing text parts", () => {
      const mainFile = path.join(tempDir, "template.liquid");
      const textPart1 = path.join(tempDir, "part1.liquid");
      const textPart2 = path.join(tempDir, "part2.liquid");
      const configFile = path.join(tempDir, "config.json");

      fs.writeFileSync(mainFile, "{% t 'test' %}");
      fs.writeFileSync(textPart1, "{% t= 'test' default:'Test' %}");
      fs.writeFileSync(textPart2, "{% t= 'other' default:'Other' %}");

      const config: TemplateConfig = {
        text_parts: ["part1.liquid", "part2.liquid"],
      };
      fs.writeFileSync(configFile, JSON.stringify(config));

      const result = provider.getRelatedFiles(`file://${mainFile}`);

      expect(result).toEqual({
        mainFile: mainFile,
        textParts: [textPart1, textPart2],
        allFiles: [mainFile, textPart1, textPart2],
      });
    });

    it("should handle relative paths in text_parts", () => {
      const subDir = path.join(tempDir, "parts");
      fs.mkdirSync(subDir);

      const mainFile = path.join(tempDir, "template.liquid");
      const textPart1 = path.join(subDir, "part1.liquid");
      const configFile = path.join(tempDir, "config.json");

      fs.writeFileSync(mainFile, "{% t 'test' %}");
      fs.writeFileSync(textPart1, "{% t= 'test' default:'Test' %}");

      const config: TemplateConfig = {
        text_parts: ["parts/part1.liquid"],
      };
      fs.writeFileSync(configFile, JSON.stringify(config));

      const result = provider.getRelatedFiles(`file://${mainFile}`);

      expect(result).toEqual({
        mainFile: mainFile,
        textParts: [textPart1],
        allFiles: [mainFile, textPart1],
      });
    });

    it("should skip non-existent text part files", () => {
      const mainFile = path.join(tempDir, "template.liquid");
      const textPart1 = path.join(tempDir, "part1.liquid");
      const configFile = path.join(tempDir, "config.json");

      fs.writeFileSync(mainFile, "{% t 'test' %}");
      fs.writeFileSync(textPart1, "{% t= 'test' default:'Test' %}");

      const config: TemplateConfig = {
        text_parts: ["part1.liquid", "nonexistent.liquid"],
      };
      fs.writeFileSync(configFile, JSON.stringify(config));

      const result = provider.getRelatedFiles(`file://${mainFile}`);

      expect(result).toEqual({
        mainFile: mainFile,
        textParts: [textPart1],
        allFiles: [mainFile, textPart1],
      });
    });

    it("should handle malformed config.json gracefully", () => {
      const mainFile = path.join(tempDir, "template.liquid");
      const configFile = path.join(tempDir, "config.json");

      fs.writeFileSync(mainFile, "{% t 'test' %}");
      fs.writeFileSync(configFile, "{ invalid json }");

      const result = provider.getRelatedFiles(`file://${mainFile}`);

      expect(result).toEqual({
        mainFile: mainFile,
        textParts: [],
        allFiles: [mainFile],
      });
    });
  });

  describe("getAllTemplateFiles", () => {
    it("should return array of all template files", () => {
      const mainFile = path.join(tempDir, "template.liquid");
      const textPart1 = path.join(tempDir, "part1.liquid");
      const configFile = path.join(tempDir, "config.json");

      fs.writeFileSync(mainFile, "{% t 'test' %}");
      fs.writeFileSync(textPart1, "{% t= 'test' default:'Test' %}");

      const config: TemplateConfig = {
        text_parts: ["part1.liquid"],
      };
      fs.writeFileSync(configFile, JSON.stringify(config));

      const result = provider.getAllTemplateFiles(`file://${mainFile}`);

      expect(result).toEqual([mainFile, textPart1]);
    });
  });

  describe("getTextPartFiles", () => {
    it("should return only text part files", () => {
      const mainFile = path.join(tempDir, "template.liquid");
      const textPart1 = path.join(tempDir, "part1.liquid");
      const textPart2 = path.join(tempDir, "part2.liquid");
      const configFile = path.join(tempDir, "config.json");

      fs.writeFileSync(mainFile, "{% t 'test' %}");
      fs.writeFileSync(textPart1, "{% t= 'test' default:'Test' %}");
      fs.writeFileSync(textPart2, "{% t= 'other' default:'Other' %}");

      const config: TemplateConfig = {
        text_parts: ["part1.liquid", "part2.liquid"],
      };
      fs.writeFileSync(configFile, JSON.stringify(config));

      const result = provider.getTextPartFiles(`file://${mainFile}`);

      expect(result).toEqual([textPart1, textPart2]);
    });

    it("should return empty array when no text parts exist", () => {
      const mainFile = path.join(tempDir, "template.liquid");
      fs.writeFileSync(mainFile, "{% t 'test' %}");

      const result = provider.getTextPartFiles(`file://${mainFile}`);

      expect(result).toEqual([]);
    });
  });

  describe("isPartOfTemplate", () => {
    it("should return true for main file", () => {
      const mainFile = path.join(tempDir, "template.liquid");
      fs.writeFileSync(mainFile, "{% t 'test' %}");

      const result = provider.isPartOfTemplate(
        `file://${mainFile}`,
        `file://${mainFile}`,
      );

      expect(result).toBe(true);
    });

    it("should return true for text part files", () => {
      const mainFile = path.join(tempDir, "template.liquid");
      const textPart1 = path.join(tempDir, "part1.liquid");
      const configFile = path.join(tempDir, "config.json");

      fs.writeFileSync(mainFile, "{% t 'test' %}");
      fs.writeFileSync(textPart1, "{% t= 'test' default:'Test' %}");

      const config: TemplateConfig = {
        text_parts: ["part1.liquid"],
      };
      fs.writeFileSync(configFile, JSON.stringify(config));

      const result = provider.isPartOfTemplate(
        `file://${textPart1}`,
        `file://${mainFile}`,
      );

      expect(result).toBe(true);
    });

    it("should return false for unrelated files", () => {
      const mainFile = path.join(tempDir, "template.liquid");
      const otherFile = path.join(tempDir, "other.liquid");

      fs.writeFileSync(mainFile, "{% t 'test' %}");
      fs.writeFileSync(otherFile, "{% t 'other' %}");

      const result = provider.isPartOfTemplate(
        `file://${otherFile}`,
        `file://${mainFile}`,
      );

      expect(result).toBe(false);
    });
  });

  describe("getMainTemplateFile", () => {
    it("should return the file itself when no config.json exists", () => {
      const mainFile = path.join(tempDir, "template.liquid");
      fs.writeFileSync(mainFile, "{% t 'test' %}");

      const result = provider.getMainTemplateFile(`file://${mainFile}`);

      expect(result).toBe(mainFile);
    });

    it("should return the file itself when it's not a text part", () => {
      const mainFile = path.join(tempDir, "template.liquid");
      const textPart1 = path.join(tempDir, "part1.liquid");
      const configFile = path.join(tempDir, "config.json");

      fs.writeFileSync(mainFile, "{% t 'test' %}");
      fs.writeFileSync(textPart1, "{% t= 'test' default:'Test' %}");

      const config: TemplateConfig = {
        text_parts: ["part1.liquid"],
      };
      fs.writeFileSync(configFile, JSON.stringify(config));

      const result = provider.getMainTemplateFile(`file://${mainFile}`);

      expect(result).toBe(mainFile);
    });

    it("should return main template file when called from text part", () => {
      const mainFile = path.join(tempDir, "template.liquid");
      const textPart1 = path.join(tempDir, "part1.liquid");
      const configFile = path.join(tempDir, "config.json");

      fs.writeFileSync(mainFile, "{% t 'test' %}");
      fs.writeFileSync(textPart1, "{% t= 'test' default:'Test' %}");

      const config: TemplateConfig = {
        text_parts: ["part1.liquid"],
      };
      fs.writeFileSync(configFile, JSON.stringify(config));

      const result = provider.getMainTemplateFile(`file://${textPart1}`);

      expect(result).toBe(mainFile);
    });

    it("should handle multiple liquid files correctly", () => {
      const mainFile = path.join(tempDir, "main.liquid");
      const textPart1 = path.join(tempDir, "part1.liquid");
      const textPart2 = path.join(tempDir, "part2.liquid");
      const configFile = path.join(tempDir, "config.json");

      fs.writeFileSync(mainFile, "{% t 'test' %}");
      fs.writeFileSync(textPart1, "{% t= 'test' default:'Test' %}");
      fs.writeFileSync(textPart2, "{% t= 'other' default:'Other' %}");

      const config: TemplateConfig = {
        text_parts: ["part1.liquid", "part2.liquid"],
      };
      fs.writeFileSync(configFile, JSON.stringify(config));

      const result = provider.getMainTemplateFile(`file://${textPart1}`);

      expect(result).toBe(mainFile);
    });

    it("should handle malformed config.json gracefully", () => {
      const mainFile = path.join(tempDir, "template.liquid");
      const configFile = path.join(tempDir, "config.json");

      fs.writeFileSync(mainFile, "{% t 'test' %}");
      fs.writeFileSync(configFile, "{ invalid json }");

      const result = provider.getMainTemplateFile(`file://${mainFile}`);

      expect(result).toBe(mainFile);
    });

    it("should find main template file from text part in subdirectory", () => {
      const subDir = path.join(tempDir, "text_parts");
      fs.mkdirSync(subDir);

      const mainFile = path.join(tempDir, "main.liquid");
      const textPart1 = path.join(subDir, "part1.liquid");
      const configFile = path.join(tempDir, "config.json");

      fs.writeFileSync(mainFile, "{% t 'test' %}");
      fs.writeFileSync(textPart1, "{% t= 'test' default:'Test' %}");

      const config: TemplateConfig = {
        text_parts: ["text_parts/part1.liquid"],
      };
      fs.writeFileSync(configFile, JSON.stringify(config));

      const result = provider.getMainTemplateFile(`file://${textPart1}`);

      expect(result).toBe(mainFile);
    });

    it("should handle text parts in subdirectories correctly", () => {
      const subDir = path.join(tempDir, "text_parts");
      fs.mkdirSync(subDir);

      const mainFile = path.join(tempDir, "recon_handle.liquid");
      const textPart1 = path.join(subDir, "part1.liquid");
      const textPart2 = path.join(subDir, "part2.liquid");
      const configFile = path.join(tempDir, "config.json");

      fs.writeFileSync(mainFile, "{% t 'test' %}");
      fs.writeFileSync(textPart1, "{% t 'test_key' %}");
      fs.writeFileSync(textPart2, "{% t= 'test_key' default:'Test' %}");

      const config: TemplateConfig = {
        text_parts: ["text_parts/part1.liquid", "text_parts/part2.liquid"],
      };
      fs.writeFileSync(configFile, JSON.stringify(config));

      // Test getting related files from main file
      const result = provider.getRelatedFiles(`file://${mainFile}`);
      expect(result.allFiles).toEqual([mainFile, textPart1, textPart2]);

      // Test getting main template from text part
      const mainFromTextPart = provider.getMainTemplateFile(
        `file://${textPart1}`,
      );
      expect(mainFromTextPart).toBe(mainFile);
    });
  });
});
