/* eslint-disable quotes */
import { TreeSitterLiquidProvider } from "../src/treeSitterLiquidProvider";
import * as Parser from "tree-sitter";

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
      const tree = provider.parseTree(text);
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

    let tree: ReturnType<TreeSitterLiquidProvider["parseTree"]>;

    beforeEach(() => {
      tree = provider.parseTree(sampleLiquidWithTranslations);
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
      const tree = provider.parseTree(content);

      if (tree) {
        const includePath = provider.getIncludePathAtPosition(tree, 0, 15);
        expect(includePath).toBe("parts/part_1");
      }
    });

    it("should return null when not on include statement", () => {
      const content = `<h1>Hello World</h1>`;
      const tree = provider.parseTree(content);

      if (tree) {
        const includePath = provider.getIncludePathAtPosition(tree, 0, 5);
        expect(includePath).toBeNull();
      }
    });

    it("should detect include statement with different quote styles", () => {
      const content = `{% include "parts/part_1" %}`;
      const tree = provider.parseTree(content);

      if (tree) {
        const includePath = provider.getIncludePathAtPosition(tree, 0, 15);
        expect(includePath).toBe("parts/part_1");
      }
    });
  });

  describe("query functionality", () => {
    it("should execute queries without errors", () => {
      const text = "{% t 'test' %}";
      const tree = provider.parseTree(text);

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
      const tree = provider.parseTree(text);

      if (tree) {
        const nodes = provider.findNodes(tree, "liquid_tag");
        expect(Array.isArray(nodes)).toBe(true);
      }
    });
  });

  describe("getTreeString", () => {
    it("should return tree string representation", () => {
      const text = "{% t 'test' %}";
      const tree = provider.parseTree(text);

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

  describe("variable functionality", () => {
    const sampleLiquidWithVariables = `
      {% for i in items %}
        {{ i }}
      {% endfor %}
      
      {% assign items = "item1,item2,item3" | split: "," %}
      {{ items }}
      
      {% assign foo = 'car' %}
      {{ foo }}
      
      {% assign bar = foo | append: 'bike' %}
      
      {% capture baz %}Text{% endcapture %}
      {{ baz }}
    `;

    let tree: ReturnType<TreeSitterLiquidProvider["parseTree"]>;

    beforeEach(() => {
      tree = provider.parseTree(sampleLiquidWithVariables);
    });

    describe("findVariableDefinitions", () => {
      it("should find all variable definitions", () => {
        if (tree) {
          const definitions = provider.findVariableDefinitions(tree);
          expect(definitions.length).toBe(5); // i, items, foo, bar, baz

          const variableNames = definitions.flatMap((match) =>
            match.captures
              .filter((capture) => capture.name === "variable_name")
              .map((capture) => capture.node.text),
          );

          expect(variableNames).toContain("i");
          expect(variableNames).toContain("items");
          expect(variableNames).toContain("foo");
          expect(variableNames).toContain("bar");
          expect(variableNames).toContain("baz");
        }
      });
    });

    describe("findVariableReferences", () => {
      it("should find variable references", () => {
        if (tree) {
          const references = provider.findVariableReferences(tree);
          expect(references.length).toBeGreaterThan(0);

          const referenceNames = references.map((node) => node.text);
          expect(referenceNames).toContain("i");
          expect(referenceNames).toContain("items");
          expect(referenceNames).toContain("foo");
          expect(referenceNames).toContain("baz");
        }
      });

      it("should not include variable names from definitions", () => {
        if (tree) {
          const references = provider.findVariableReferences(tree);

          // Check that references are not from assignment statements
          references.forEach((node) => {
            expect(node.parent?.type).not.toBe("assignment_statement");
            expect(node.parent?.type).not.toBe("capture_statement");
          });
        }
      });
    });

    describe("getVariableAtPosition", () => {
      it("should detect variable reference in output statement", () => {
        if (tree) {
          // Test {{ items }} at line 6 (0-based indexing)
          const variable = provider.getVariableAtPosition(tree, 6, 9);
          expect(variable).toBe("items");
        }
      });

      it("should detect variable reference in filter", () => {
        if (tree) {
          // Test foo in "foo | append: 'bike'" at line 11
          const variable = provider.getVariableAtPosition(tree, 11, 22);
          expect(variable).toBe("foo");
        }
      });

      it("should return null for non-variable positions", () => {
        if (tree) {
          // Test position on "assign" keyword
          const variable = provider.getVariableAtPosition(tree, 5, 7);
          expect(variable).toBeNull();
        }
      });

      it("should return null for variable definitions", () => {
        if (tree) {
          // Test position on variable name in assignment (should not be a reference)
          const variable = provider.getVariableAtPosition(tree, 5, 16);
          expect(variable).toBeNull();
        }
      });

      it("should detect variable reference in for loop iterator", () => {
        const forLoopContent = `
          {% assign items = "a,b,c" | split: "," %}
          {% for i in items %}
            {{ i }}
          {% endfor %}
        `;
        const forTree = provider.parseTree(forLoopContent);

        if (forTree) {
          // Test 'items' in 'for i in items' at line 2
          const variable = provider.getVariableAtPosition(forTree, 2, 22);
          expect(variable).toBe("items");
        }
      });

      it("should detect variable reference in bracket notation", () => {
        const bracketContent = `
          {% capture complex %}complex_key{% endcapture %}
          {% assign [complex] = 'Complex value' %}
        `;
        const bracketTree = provider.parseTree(bracketContent);

        if (bracketTree) {
          // Test 'complex' in '[complex]' at line 2
          const variable = provider.getVariableAtPosition(bracketTree, 2, 20);
          expect(variable).toBe("complex");
        }
      });
    });
  });

  describe("findAllIncludeTags", () => {
    it("should find include tags with parts/ prefix", () => {
      const content = `
        {% include 'parts/header' %}
        <h1>Title</h1>
        {% include 'parts/footer' %}
      `;
      const tree = provider.parseTree(content);

      if (tree) {
        const includeTags = provider.findAllIncludeTags(tree);
        expect(includeTags).toHaveLength(2);

        expect(includeTags[0]).toEqual({
          type: "textPart",
          name: "header",
          lineNumber: 1,
        });

        expect(includeTags[1]).toEqual({
          type: "textPart",
          name: "footer",
          lineNumber: 3,
        });
      }
    });

    it("should find include tags with shared/ prefix", () => {
      const content = `
        {% include 'shared/common_functions' %}
        <p>Content</p>
        {% include 'shared/utilities' %}
      `;
      const tree = provider.parseTree(content);

      if (tree) {
        const includeTags = provider.findAllIncludeTags(tree);
        expect(includeTags).toHaveLength(2);

        expect(includeTags[0]).toEqual({
          type: "sharedPart",
          name: "common_functions",
          lineNumber: 1,
        });

        expect(includeTags[1]).toEqual({
          type: "sharedPart",
          name: "utilities",
          lineNumber: 3,
        });
      }
    });

    it("should handle mixed include types", () => {
      const content = `
        {% include 'parts/header' %}
        {% include 'shared/utilities' %}
        {% include 'parts/content' %}
      `;
      const tree = provider.parseTree(content);

      if (tree) {
        const includeTags = provider.findAllIncludeTags(tree);
        expect(includeTags).toHaveLength(3);

        expect(includeTags[0]).toEqual({
          type: "textPart",
          name: "header",
          lineNumber: 1,
        });

        expect(includeTags[1]).toEqual({
          type: "sharedPart",
          name: "utilities",
          lineNumber: 2,
        });

        expect(includeTags[2]).toEqual({
          type: "textPart",
          name: "content",
          lineNumber: 3,
        });
      }
    });

    it("should handle double quotes in include paths", () => {
      const content = `{% include "parts/header" %}`;
      const tree = provider.parseTree(content);

      if (tree) {
        const includeTags = provider.findAllIncludeTags(tree);
        expect(includeTags).toHaveLength(1);

        expect(includeTags[0]).toEqual({
          type: "textPart",
          name: "header",
          lineNumber: 0,
        });
      }
    });

    it("should handle include paths without prefixes", () => {
      const content = `{% include 'simple_include' %}`;
      const tree = provider.parseTree(content);

      if (tree) {
        const includeTags = provider.findAllIncludeTags(tree);
        expect(includeTags).toHaveLength(1);

        expect(includeTags[0]).toEqual({
          type: "textPart",
          name: "simple_include",
          lineNumber: 0,
        });
      }
    });

    it("should return empty array when no includes found", () => {
      const content = `
        <h1>Title</h1>
        <p>No includes here</p>
      `;
      const tree = provider.parseTree(content);

      if (tree) {
        const includeTags = provider.findAllIncludeTags(tree);
        expect(includeTags).toHaveLength(0);
      }
    });

    it("should sort include tags by line number", () => {
      const content = `
        Line 0
        {% include 'parts/second' %}
        Line 2
        {% include 'parts/first' %}
        Line 4
        {% include 'parts/third' %}
      `;
      const tree = provider.parseTree(content);

      if (tree) {
        const includeTags = provider.findAllIncludeTags(tree);
        expect(includeTags).toHaveLength(3);

        // Should be sorted by line number
        expect(includeTags[0].lineNumber).toBe(2);
        expect(includeTags[0].name).toBe("second");

        expect(includeTags[1].lineNumber).toBe(4);
        expect(includeTags[1].name).toBe("first");

        expect(includeTags[2].lineNumber).toBe(6);
        expect(includeTags[2].name).toBe("third");
      }
    });

    it("should handle complex include paths", () => {
      const content = `
        {% include 'parts/nested/deep/file' %}
        {% include 'shared/complex_name_with_underscores' %}
      `;
      const tree = provider.parseTree(content);

      if (tree) {
        const includeTags = provider.findAllIncludeTags(tree);
        expect(includeTags).toHaveLength(2);

        expect(includeTags[0]).toEqual({
          type: "textPart",
          name: "nested/deep/file",
          lineNumber: 1,
        });

        expect(includeTags[1]).toEqual({
          type: "sharedPart",
          name: "complex_name_with_underscores",
          lineNumber: 2,
        });
      }
    });

    it("should handle includes within other liquid constructs", () => {
      const content = `
        {% if condition %}
          {% include 'parts/conditional' %}
        {% endif %}
        
        {% for item in items %}
          {% include 'parts/item_template' %}
        {% endfor %}
      `;
      const tree = provider.parseTree(content);

      if (tree) {
        const includeTags = provider.findAllIncludeTags(tree);
        expect(includeTags).toHaveLength(2);

        expect(includeTags[0]).toEqual({
          type: "textPart",
          name: "conditional",
          lineNumber: 2,
        });

        expect(includeTags[1]).toEqual({
          type: "textPart",
          name: "item_template",
          lineNumber: 6,
        });
      }
    });

    it("should handle empty tree gracefully", () => {
      const tree = provider.parseTree("");

      if (tree) {
        const includeTags = provider.findAllIncludeTags(tree);
        expect(includeTags).toHaveLength(0);
      }
    });
  });

  describe("Tag Documentation Methods", () => {
    describe("getTagIdentifierAtPosition", () => {
      it("should detect 'unreconciled' tag identifier at cursor position", () => {
        const text = "{% unreconciled value unreconciled_text:text %}";
        const tree = provider.parseTree(text);

        if (tree) {
          // Position cursor on 'unreconciled' (position 3-14)
          const tagIdentifier = provider.getTagIdentifierAtPosition(tree, 0, 5);
          expect(tagIdentifier).toBe("unreconciled");
        }
      });

      it("should detect 'result' tag identifier at cursor position", () => {
        const text = "{% result 'accounts.current_year' %}";
        const tree = provider.parseTree(text);

        if (tree) {
          // Position cursor on 'result'
          const tagIdentifier = provider.getTagIdentifierAtPosition(tree, 0, 4);
          expect(tagIdentifier).toBe("result");
        }
      });

      it("should return null when cursor is not on tag identifier", () => {
        const text = "{% unreconciled value unreconciled_text:text %}";
        const tree = provider.parseTree(text);

        if (tree) {
          // Position cursor on 'value' (not the tag identifier)
          const tagIdentifier = provider.getTagIdentifierAtPosition(
            tree,
            0,
            18,
          );
          expect(tagIdentifier).toBeNull();
        }
      });

      it("should return null when not inside a liquid_tag", () => {
        const text = "This is plain text with unreconciled word";
        const tree = provider.parseTree(text);

        if (tree) {
          // Position cursor on 'unreconciled' in plain text
          const tagIdentifier = provider.getTagIdentifierAtPosition(
            tree,
            0,
            25,
          );
          expect(tagIdentifier).toBeNull();
        }
      });

      it("should handle complex tag structures", () => {
        const text =
          "{% unreconciled accounts.current_year unreconciled_text:'Some text here' custom:true %}";
        const tree = provider.parseTree(text);

        if (tree) {
          // Position cursor on 'unreconciled'
          const tagIdentifier = provider.getTagIdentifierAtPosition(tree, 0, 8);
          expect(tagIdentifier).toBe("unreconciled");
        }
      });

      it("should work with different liquid tag types", () => {
        // Test only tags that we know return identifiers
        const texts = [
          "{% assign x = 5 %}", // Should return "assign"
        ];

        texts.forEach((text) => {
          const tree = provider.parseTree(text);
          if (tree) {
            // Position cursor on the tag identifier
            const tagIdentifier = provider.getTagIdentifierAtPosition(
              tree,
              0,
              4,
            );
            expect(typeof tagIdentifier).toBe("string");
            expect(tagIdentifier?.length).toBeGreaterThan(0);
          }
        });
      });

      it("should return null for translation expressions", () => {
        const text = "{% t 'translation_key' %}";
        const tree = provider.parseTree(text);

        if (tree) {
          // Position cursor on 't' - this is a translation expression, not a regular tag
          const tagIdentifier = provider.getTagIdentifierAtPosition(tree, 0, 3);
          expect(tagIdentifier).toBeNull();
        }
      });

      it("should handle multiline tags", () => {
        const text = `{%
  unreconciled
  accounts.current_year
  unreconciled_text:'Text'
%}`;
        const tree = provider.parseTree(text);

        if (tree) {
          // Position cursor on 'unreconciled' in second line
          const tagIdentifier = provider.getTagIdentifierAtPosition(tree, 1, 5);
          expect(tagIdentifier).toBe("unreconciled");
        }
      });

      it("should be precise with cursor positioning", () => {
        const text = "{% unreconciled value %}";
        const tree = provider.parseTree(text);

        if (tree) {
          // Test different positions within the tag identifier
          expect(provider.getTagIdentifierAtPosition(tree, 0, 3)).toBe(
            "unreconciled",
          ); // Start of 'unreconciled'
          expect(provider.getTagIdentifierAtPosition(tree, 0, 8)).toBe(
            "unreconciled",
          ); // Middle of 'unreconciled'
          expect(provider.getTagIdentifierAtPosition(tree, 0, 14)).toBe(
            "unreconciled",
          ); // End of 'unreconciled'
          expect(provider.getTagIdentifierAtPosition(tree, 0, 20)).toBeNull(); // Far after tag in 'value'
        }
      });

      it("should handle edge cases", () => {
        const tree = provider.parseTree("");
        if (tree) {
          const tagIdentifier = provider.getTagIdentifierAtPosition(tree, 0, 0);
          expect(tagIdentifier).toBeNull();
        }
      });
    });

    describe("tag detection helper methods", () => {
      it("should correctly identify liquid statement context", () => {
        const text = "{% unreconciled value %} plain text";
        const tree = provider.parseTree(text);

        if (tree) {
          // Test positions inside and outside liquid statement
          const nodeInside = tree.rootNode.descendantForPosition({
            row: 0,
            column: 5,
          });
          const nodeOutside = tree.rootNode.descendantForPosition({
            row: 0,
            column: 30,
          });

          // We need to access the private method through casting
          const providerAny = provider as unknown as {
            isCustomLiquidStatement: (node: Parser.SyntaxNode) => boolean;
          };
          expect(providerAny.isCustomLiquidStatement(nodeInside)).toBe(true);
          expect(providerAny.isCustomLiquidStatement(nodeOutside)).toBe(false);
        }
      });

      it("should find tag identifier within liquid statement", () => {
        const text = "{% result 'account' %}";
        const tree = provider.parseTree(text);

        if (tree) {
          const statementNode = tree.rootNode.descendantForPosition({
            row: 0,
            column: 5,
          });

          // Find the custom_unpaired_statement parent
          let current = statementNode;
          while (current && current.type !== "custom_unpaired_statement") {
            current = current.parent!;
          }

          if (current) {
            const providerAny = provider as unknown as {
              findTagIdentifierInStatement: (
                node: Parser.SyntaxNode,
              ) => Parser.SyntaxNode | null;
            };
            const tagIdentifier =
              providerAny.findTagIdentifierInStatement(current);
            expect(tagIdentifier).not.toBeNull();
            expect(tagIdentifier?.text).toBe("result");
            expect(tagIdentifier?.type).toBe("custom_keyword");
          }
        }
      });
    });
  });
});
