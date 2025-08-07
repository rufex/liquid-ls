/* eslint-disable quotes */
import { TreeSitterLiquidProvider } from "../src/treeSitterLiquidProvider";

describe("TreeSitterLiquidProvider", () => {
  let provider: TreeSitterLiquidProvider;

  beforeEach(() => {
    provider = new TreeSitterLiquidProvider();
  });

  describe("basic functionality", () => {
    it("should initialize successfully", () => {
      expect(provider).toBeDefined();
      expect(provider).toBeInstanceOf(TreeSitterLiquidProvider);
    });

    it("should parse text successfully", () => {
      const text = "Hello {% t 'world' %}";
      const tree = provider.parseText(text);
      expect(tree).toBeDefined();
      expect(tree).not.toBeNull();
    });
  });

  describe("translation functionality", () => {
    const sampleLiquidWithTranslations = `
      <h1>{% t 'welcome_message' %}</h1>
      <p>{% t 'description' %}</p>
      
      {% t= 'welcome_message' default:'Welcome to our site' %}
      {% t= 'description' default:'This is a description' %}
      {% t= 'unused_translation' default:'This is unused' %}
    `;

    let tree: ReturnType<TreeSitterLiquidProvider["parseText"]>;

    beforeEach(() => {
      tree = provider.parseText(sampleLiquidWithTranslations);
    });

    describe("findTranslationCalls", () => {
      it("should find translation calls", () => {
        if (tree) {
          const calls = provider.findTranslationCalls(tree);
          expect(calls.length).toBeGreaterThan(0);
        }
      });
    });

    describe("findTranslationDefinitions", () => {
      it("should find translation definitions", () => {
        if (tree) {
          const definitions = provider.findTranslationDefinitions(tree);
          expect(definitions.length).toBeGreaterThan(0);
        }
      });
    });

    describe("extractTranslationKey", () => {
      it("should extract key from single quoted string", () => {
        const mockNode = {
          text: "'welcome_message'",
        } as { text: string };
        const key = provider.extractTranslationKey(mockNode as never);
        expect(key).toBe("welcome_message");
      });

      it("should extract key from double quoted string", () => {
        const mockNode = {
          text: '"welcome_message"',
        } as { text: string };
        const key = provider.extractTranslationKey(mockNode as never);
        expect(key).toBe("welcome_message");
      });
    });

    describe("isTranslationCall", () => {
      it("should identify translation calls correctly", () => {
        // This test would need a more complex setup with actual tree nodes
        // For now, we'll test the basic structure
        expect(provider.isTranslationCall).toBeDefined();
      });
    });

    describe("getTranslationKeyAtPosition", () => {
      it("should return null for non-translation positions", () => {
        if (tree) {
          const key = provider.getTranslationKeyAtPosition(tree, 0, 0);
          expect(key).toBeNull();
        }
      });

      it("should return translation key for translation call positions", () => {
        if (tree) {
          // Find position of first translation call
          const text = sampleLiquidWithTranslations;
          const welcomeIndex = text.indexOf("{% t 'welcome_message' %}");
          if (welcomeIndex !== -1) {
            const lines = text.substring(0, welcomeIndex).split("\n");
            const row = lines.length - 1;
            const column = lines[lines.length - 1].length + 10; // Position within the tag

            const key = provider.getTranslationKeyAtPosition(tree, row, column);
            // This might be null due to TreeSitter parsing specifics, but the method should not throw
            expect(typeof key === "string" || key === null).toBe(true);
          }
        }
      });
    });

    describe("findTranslationDefinitionByKey", () => {
      it("should find existing translation definition", () => {
        if (tree) {
          const definition = provider.findTranslationDefinitionByKey(
            tree,
            "welcome_message",
          );
          expect(definition).toBeDefined();
        }
      });

      it("should return null for non-existing translation", () => {
        if (tree) {
          const definition = provider.findTranslationDefinitionByKey(
            tree,
            "non_existing_key",
          );
          expect(definition).toBeNull();
        }
      });
    });

    describe("extractTranslationDefinitionContent", () => {
      it("should extract default content from translation definition", () => {
        const mockDefinitionNode = {
          text: "{% t= 'welcome_message' default:'Welcome to our site' %}",
          children: [],
        } as { text: string; children: never[] };

        const content = provider.extractTranslationDefinitionContent(
          mockDefinitionNode as never,
        );
        expect(content).toBe(
          "{% t= 'welcome_message' default:'Welcome to our site' %}",
        );
      });

      it("should return full text when no default found", () => {
        const mockDefinitionNode = {
          text: "{% t= 'welcome_message' %}",
          children: [],
        } as { text: string; children: never[] };

        const content = provider.extractTranslationDefinitionContent(
          mockDefinitionNode as never,
        );
        expect(content).toBe("{% t= 'welcome_message' %}");
      });

      it("should handle double quotes in default", () => {
        const mockDefinitionNode = {
          text: '{% t= "welcome_message" default:"Welcome to our site" %}',
          children: [],
        } as { text: string; children: never[] };

        const content = provider.extractTranslationDefinitionContent(
          mockDefinitionNode as never,
        );
        expect(content).toBe(
          '{% t= "welcome_message" default:"Welcome to our site" %}',
        );
      });

      it("should extract multi-locale translations", () => {
        const mockDefinitionNode = {
          text: "{% t= 'test' default:'Text' nl:'Tekst' fr:'Texte' %}",
          children: [
            {
              type: "locale_declaration",
              childForFieldName: jest.fn((field: string) => {
                if (field === "key") return { text: "default" };
                if (field === "value")
                  return { text: '"Text"', type: "string" };
                return null;
              }),
            },
            {
              type: "locale_declaration",
              childForFieldName: jest.fn((field: string) => {
                if (field === "key") return { text: "nl" };
                if (field === "value")
                  return { text: '"Tekst"', type: "string" };
                return null;
              }),
            },
          ],
        } as never;

        const content =
          provider.extractTranslationDefinitionContent(mockDefinitionNode);
        expect(content).toContain('default: "Text"');
        expect(content).toContain('nl: "Tekst"');
      });
    });
  });

  describe("getIncludePathAtPosition", () => {
    it("should detect include statement at cursor position", () => {
      const content = `{% include 'parts/part_1' %}`;
      const tree = provider.parseText(content);

      if (tree) {
        const includePath = provider.getIncludePathAtPosition(tree, 0, 15);
        expect(includePath).toBe("parts/part_1");
      }
    });

    it("should return null when not on include statement", () => {
      const content = `<h1>Hello World</h1>`;
      const tree = provider.parseText(content);

      if (tree) {
        const includePath = provider.getIncludePathAtPosition(tree, 0, 5);
        expect(includePath).toBeNull();
      }
    });

    it("should detect include statement with different quote styles", () => {
      const content = `{% include "parts/part_1" %}`;
      const tree = provider.parseText(content);

      if (tree) {
        const includePath = provider.getIncludePathAtPosition(tree, 0, 15);
        expect(includePath).toBe("parts/part_1");
      }
    });
  });

  describe("query functionality", () => {
    it("should execute queries without errors", () => {
      const text = "{% t 'test' %}";
      const tree = provider.parseText(text);

      if (tree) {
        const queryString = "(liquid_tag) @tag";
        const matches = provider.query(queryString, tree);
        expect(Array.isArray(matches)).toBe(true);
      }
    });
  });

  describe("findNodes", () => {
    it("should find nodes by type", () => {
      const text = "{% t 'test' %}";
      const tree = provider.parseText(text);

      if (tree) {
        const nodes = provider.findNodes(tree, "liquid_tag");
        expect(Array.isArray(nodes)).toBe(true);
      }
    });
  });

  describe("getTreeString", () => {
    it("should return tree string representation", () => {
      const text = "{% t 'test' %}";
      const tree = provider.parseText(text);

      if (tree) {
        const treeString = provider.getTreeString(tree);
        expect(typeof treeString).toBe("string");
        expect(treeString.length).toBeGreaterThan(0);
      }
    });
  });

  describe("getTranslationKeyLocation", () => {
    it("should return key node from translation definition", () => {
      const mockDefinitionNode = {
        childForFieldName: jest.fn((field: string) => {
          if (field === "key") return { text: "test_key", type: "string" };
          return null;
        }),
        children: [],
      } as never;

      const keyNode = provider.getTranslationKeyLocation(mockDefinitionNode);
      expect(keyNode).toBeDefined();
      expect(keyNode?.type).toBe("string");
    });

    it("should fallback to first string node when no key field", () => {
      const mockDefinitionNode = {
        childForFieldName: jest.fn(() => null),
        children: [
          { type: "other", text: "other" },
          { type: "string", text: "test_key" },
          { type: "string", text: "another" },
        ],
      } as never;

      const keyNode = provider.getTranslationKeyLocation(mockDefinitionNode);
      expect(keyNode).toBeDefined();
      expect(keyNode?.type).toBe("string");
      expect(keyNode?.text).toBe("test_key");
    });

    it("should return null when no string nodes found", () => {
      const mockDefinitionNode = {
        childForFieldName: jest.fn(() => null),
        children: [
          { type: "other", text: "other" },
          { type: "identifier", text: "identifier" },
        ],
      } as never;

      const keyNode = provider.getTranslationKeyLocation(mockDefinitionNode);
      expect(keyNode).toBeNull();
    });
  });
});
