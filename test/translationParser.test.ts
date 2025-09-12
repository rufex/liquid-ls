import { TranslationParser } from "../src/liquid/translationParser";
import * as fs from "fs";
import * as path from "path";

describe("TranslationParser", () => {
  let provider: TranslationParser;
  const fixturesPath = path.join(__dirname, "../fixtures/market-repo");

  beforeEach(() => {
    provider = new TranslationParser();
  });

  describe("isTranslationExpression", () => {
    it("should return translation_statement node when cursor is on translation definition", () => {
      const content = '{% t="title_t" default:"Title" es:"Título" %}';

      // Test cursor on the key
      const result = provider.isTranslationExpression(content, 0, 6);

      expect(result).not.toBeNull();
      expect(result?.type).toBe("translation_statement");
    });

    it("should return translation_statement node when cursor is on any part of the statement", () => {
      const content = '{% t="title_t" default:"Title" es:"Título" %}';

      // Test different cursor positions within the statement
      const positions = [
        { line: 0, column: 3 }, // Inside statement
        { line: 0, column: 6 }, // On key
        { line: 0, column: 20 }, // On default value
        { line: 0, column: 35 }, // On es value
      ];

      positions.forEach(({ line, column }) => {
        const result = provider.isTranslationExpression(content, line, column);
        expect(result).not.toBeNull();
        expect(result?.type).toBe("translation_statement");
      });
    });

    it("should return null when cursor is not on a translation statement", () => {
      const content = `
        {% assign var = "value" %}
        {% t="title_t" default:"Title" %}
        {{ var }}
      `;

      // Test cursor on assign statement (line 1)
      const result = provider.isTranslationExpression(content, 1, 15);
      expect(result).toBeNull();

      // Test cursor on output statement (line 3)
      const result2 = provider.isTranslationExpression(content, 3, 5);
      expect(result2).toBeNull();
    });

    it("should work with fixture files containing translation statements", () => {
      const filePath = path.join(
        fixturesPath,
        "reconciliation_texts/reconciliation_text_1/text_parts/part_1.liquid",
      );
      const content = fs.readFileSync(filePath, "utf-8");

      // Line 0 contains: {% t="title_t" default:"Title" es:"Título" %}
      const result = provider.isTranslationExpression(content, 0, 5);

      expect(result).not.toBeNull();
      expect(result?.type).toBe("translation_statement");
    });

    it("should work with shared parts fixture", () => {
      const filePath = path.join(
        fixturesPath,
        "shared_parts/shared_part_1/shared_part_1.liquid",
      );
      const content = fs.readFileSync(filePath, "utf-8");

      // Line 0 contains: {% t= "shared_translation_1" default:"Shared Translation 1" nl:"Gedeelde Vertaling 1" %}
      const result = provider.isTranslationExpression(content, 0, 10);

      expect(result).not.toBeNull();
      expect(result?.type).toBe("translation_statement");
    });

    it("should handle multiline content correctly", () => {
      const content = `
        Some text here
        {% t="multiline_key" default:"Default text" %}
        More content
      `;

      const result = provider.isTranslationExpression(content, 2, 15);
      expect(result).not.toBeNull();
      expect(result?.type).toBe("translation_statement");

      // Test line without translation
      const result2 = provider.isTranslationExpression(content, 1, 5);
      expect(result2).toBeNull();
    });
  });

  describe("findAll", () => {
    it("should find all translation expressions with matching key", () => {
      const content = `
        {% t "title_t" %}
        Some text here
        {% t "title_t" %}
        {% t "other_key" %}
        {{ title_t }}
        {% t "title_t" %}
      `;

      const results = provider.findAll(content, "title_t");

      expect(results).toHaveLength(3);
      results.forEach((node) => {
        expect(node.type).toBe("translation_expression");
      });
    });

    it("should return empty array when no matches found", () => {
      const content = `
        {% t "other_key" %}
        {% t "another_key" %}
      `;

      const results = provider.findAll(content, "title_t");
      expect(results).toHaveLength(0);
    });

    it("should work with fixture files", () => {
      const filePath = path.join(
        fixturesPath,
        "reconciliation_texts/reconciliation_text_1/main.liquid",
      );
      const content = fs.readFileSync(filePath, "utf-8");

      // Should find the translation expression for "title_t" in line 7
      const results = provider.findAll(content, "title_t");

      expect(results.length).toBeGreaterThan(0);
      results.forEach((node) => {
        expect(node.type).toBe("translation_expression");
      });
    });

    it("should find translation expressions with different quote types", () => {
      const content = `
        {% t 'single_quote_key' %}
        {% t "double_quote_key" %}
        {% t 'single_quote_key' %}
      `;

      const singleQuoteResults = provider.findAll(content, "single_quote_key");
      expect(singleQuoteResults).toHaveLength(2);

      const doubleQuoteResults = provider.findAll(content, "double_quote_key");
      expect(doubleQuoteResults).toHaveLength(1);
    });

    it("should find multiple occurrences across complex content", () => {
      const content = `
        {% comment %} Some comment {% endcomment %}
        {% t "shared_key" %}
        
        {% if condition %}
          {% t "shared_key" %}
        {% endif %}
        
        {% for item in items %}
          {{ item.name }}
          {% t "shared_key" %}
        {% endfor %}
        
        {% t "other_key" %}
        {% t "shared_key" %}
      `;

      const results = provider.findAll(content, "shared_key");
      expect(results).toHaveLength(4);

      const otherResults = provider.findAll(content, "other_key");
      expect(otherResults).toHaveLength(1);
    });

    it("should handle empty content", () => {
      const results = provider.findAll("", "any_key");
      expect(results).toHaveLength(0);
    });

    it("should handle content with no translations", () => {
      const content = `
        {% assign var = "value" %}
        {{ var }}
        {% if condition %}
          <p>Some HTML</p>
        {% endif %}
      `;

      const results = provider.findAll(content, "any_key");
      expect(results).toHaveLength(0);
    });

    it("should work with real fixture content searching for known keys", () => {
      const filePath = path.join(
        fixturesPath,
        "reconciliation_texts/reconciliation_text_1/main.liquid",
      );
      const content = fs.readFileSync(filePath, "utf-8");

      // Test with keys we know exist in the fixture
      const titleResults = provider.findAll(content, "title_t");
      expect(titleResults.length).toBeGreaterThan(0);

      const subtitleResults = provider.findAll(content, "subtitle_t");
      expect(subtitleResults.length).toBeGreaterThan(0);

      const sharedResults = provider.findAll(content, "shared_translation_1");
      expect(sharedResults.length).toBeGreaterThan(0);

      // Test with a key that shouldn't exist
      const nonExistentResults = provider.findAll(content, "non_existent_key");
      expect(nonExistentResults).toHaveLength(0);
    });
  });

  describe("error handling", () => {
    it("should handle malformed liquid syntax gracefully", () => {
      const malformedContent = "{% t incomplete";

      const isTransResult = provider.isTranslationExpression(
        malformedContent,
        0,
        5,
      );
      expect(isTransResult).toBeNull();

      const findAllResult = provider.findAll(malformedContent, "any_key");
      expect(findAllResult).toHaveLength(0);
    });

    it("should handle out of bounds positions", () => {
      const content = "{% t "key" %}";

      // Line out of bounds
      const result1 = provider.isTranslationExpression(content, 10, 0);
      expect(result1).toBeNull();

      // Column out of bounds should still work (TreeSitter handles this)
      const result2 = provider.isTranslationExpression(content, 0, 1000);
      expect(result2).not.toBeNull(); // TreeSitter finds closest valid position
    });
  });
});
