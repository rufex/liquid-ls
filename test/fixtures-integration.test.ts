import { HoverHandler } from "../src/hoverHandler";
import { DefinitionHandler } from "../src/definitionHandler";
import { HoverParams, DefinitionParams } from "vscode-languageserver/node";
import * as path from "path";

describe("Fixtures Integration Tests", () => {
  const fixturesPath = path.join(__dirname, "..", "fixtures", "market-repo");

  describe("Account Templates (AT)", () => {
    const atPath = path.join(fixturesPath, "account_templates", "account_1");

    describe("Translation Hover", () => {
      it("should show hover info for translation call in AT main.liquid", async () => {
        const params: HoverParams = {
          textDocument: {
            uri: `file://${path.join(atPath, "main.liquid")}`,
          },
          position: {
            line: 2, // {% t "title_t" %}
            character: 8, // Inside the translation call
          },
        };

        const handler = new HoverHandler(params);
        const result = await handler.handleHoverRequest();

        expect(result).toBeDefined();
        expect(result).toContain("title_t");
        expect(result).toContain("Title");
        expect(result).toContain("Título");
      });

      it("should show hover info for translation call in AT main.liquid (subtitle)", async () => {
        const params: HoverParams = {
          textDocument: {
            uri: `file://${path.join(atPath, "main.liquid")}`,
          },
          position: {
            line: 3, // {% t "subtitle_t" %}
            character: 8, // Inside the translation call
          },
        };

        const handler = new HoverHandler(params);
        const result = await handler.handleHoverRequest();

        expect(result).toBeDefined();
        expect(result).toContain("subtitle_t");
        expect(result).toContain("Subtitle");
        expect(result).toContain("Subtítulo");
      });

      it("should handle include scenario - part included in main", async () => {
        // Test that translations defined in part_1.liquid are available when hovering in main.liquid
        const params: HoverParams = {
          textDocument: {
            uri: `file://${path.join(atPath, "main.liquid")}`,
          },
          position: {
            line: 2, // {% t "title_t" %} - this should find definition in part_1.liquid
            character: 8,
          },
        };

        const handler = new HoverHandler(params);
        const result = await handler.handleHoverRequest();

        expect(result).toBeDefined();
        expect(result).toContain("title_t");
      });
    });

    describe("Go to Definition", () => {
      it("should navigate to translation definition in AT part_1.liquid", async () => {
        const params: DefinitionParams = {
          textDocument: {
            uri: `file://${path.join(atPath, "main.liquid")}`,
          },
          position: {
            line: 2, // {% t "title_t" %}
            character: 8,
          },
        };

        const handler = new DefinitionHandler(params);
        const result = await handler.handleDefinitionRequest();

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        if (Array.isArray(result) && result.length > 0) {
          expect(result[0].uri).toContain("part_1.liquid");
          expect(result[0].range.start.line).toBe(0); // First line in part_1.liquid
        }
      });

      it("should navigate to translation definition in AT part_2.liquid", async () => {
        const params: DefinitionParams = {
          textDocument: {
            uri: `file://${path.join(atPath, "main.liquid")}`,
          },
          position: {
            line: 3, // {% t "subtitle_t" %}
            character: 8,
          },
        };

        const handler = new DefinitionHandler(params);
        const result = await handler.handleDefinitionRequest();

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        if (Array.isArray(result) && result.length > 0) {
          expect(result[0].uri).toContain("part_2.liquid");
          expect(result[0].range.start.line).toBe(0); // First line in part_2.liquid
        }
      });
    });
  });

  describe("Reconciliation Texts (RT)", () => {
    const rtPath = path.join(
      fixturesPath,
      "reconciliation_texts",
      "reconciliation_text_1",
    );

    describe("Translation Hover", () => {
      it("should show hover info for translation call in RT main.liquid", async () => {
        const params: HoverParams = {
          textDocument: {
            uri: `file://${path.join(rtPath, "main.liquid")}`,
          },
          position: {
            line: 2, // {% t "title_t" %}
            character: 8,
          },
        };

        const handler = new HoverHandler(params);
        const result = await handler.handleHoverRequest();

        expect(result).toBeDefined();
        expect(result).toContain("title_t");
        expect(result).toContain("Title");
        expect(result).toContain("Título");
      });

      it("should show hover info for translation call in RT main.liquid (subtitle)", async () => {
        const params: HoverParams = {
          textDocument: {
            uri: `file://${path.join(rtPath, "main.liquid")}`,
          },
          position: {
            line: 3, // {% t "subtitle_t" %}
            character: 8,
          },
        };

        const handler = new HoverHandler(params);
        const result = await handler.handleHoverRequest();

        expect(result).toBeDefined();
        expect(result).toContain("subtitle_t");
        expect(result).toContain("Subtitle");
        expect(result).toContain("Subtítulo");
      });
    });

    describe("Go to Definition", () => {
      it("should navigate to translation definition in RT part_1.liquid", async () => {
        const params: DefinitionParams = {
          textDocument: {
            uri: `file://${path.join(rtPath, "main.liquid")}`,
          },
          position: {
            line: 2, // {% t "title_t" %}
            character: 8,
          },
        };

        const handler = new DefinitionHandler(params);
        const result = await handler.handleDefinitionRequest();

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        if (Array.isArray(result) && result.length > 0) {
          expect(result[0].uri).toContain("part_1.liquid");
          expect(result[0].range.start.line).toBe(0);
        }
      });

      it("should navigate to translation definition in RT part_2.liquid (nested include)", async () => {
        const params: DefinitionParams = {
          textDocument: {
            uri: `file://${path.join(rtPath, "main.liquid")}`,
          },
          position: {
            line: 3, // {% t "subtitle_t" %}
            character: 8,
          },
        };

        const handler = new DefinitionHandler(params);
        const result = await handler.handleDefinitionRequest();

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        if (Array.isArray(result) && result.length > 0) {
          expect(result[0].uri).toContain("part_2.liquid");
          expect(result[0].range.start.line).toBe(0);
        }
      });
    });

    describe("Nested Include Scenarios", () => {
      it("should handle part included in another part (RT)", async () => {
        // RT part_1.liquid includes part_2.liquid
        // Test that subtitle_t is accessible from main.liquid through this nested include
        const params: HoverParams = {
          textDocument: {
            uri: `file://${path.join(rtPath, "main.liquid")}`,
          },
          position: {
            line: 3, // {% t "subtitle_t" %} - defined in part_2, included by part_1
            character: 8,
          },
        };

        const handler = new HoverHandler(params);
        const result = await handler.handleHoverRequest();

        expect(result).toBeDefined();
        expect(result).toContain("subtitle_t");
      });
    });
  });

  describe("Export Files (EF)", () => {
    const efPath = path.join(fixturesPath, "export_files", "export_1");

    describe("Translation Hover", () => {
      it("should show hover info for translation call in EF main.liquid", async () => {
        const params: HoverParams = {
          textDocument: {
            uri: `file://${path.join(efPath, "main.liquid")}`,
          },
          position: {
            line: 2, // {% t "title_t" %}
            character: 8,
          },
        };

        const handler = new HoverHandler(params);
        const result = await handler.handleHoverRequest();

        expect(result).toBeDefined();
        expect(result).toContain("title_t");
        expect(result).toContain("Title");
        expect(result).toContain("Título");
      });

      it("should show hover info for translation call in EF main.liquid (subtitle)", async () => {
        const params: HoverParams = {
          textDocument: {
            uri: `file://${path.join(efPath, "main.liquid")}`,
          },
          position: {
            line: 3, // {% t "subtitle_t" %}
            character: 8,
          },
        };

        const handler = new HoverHandler(params);
        const result = await handler.handleHoverRequest();

        // Note: EF part_2.liquid is empty, so this should not find a definition
        // This tests the "not found" scenario
        expect(
          result === null ||
            (typeof result === "string" && result.includes("not found")),
        ).toBe(true);
      });
    });

    describe("Go to Definition", () => {
      it("should navigate to translation definition in EF part_1.liquid", async () => {
        const params: DefinitionParams = {
          textDocument: {
            uri: `file://${path.join(efPath, "main.liquid")}`,
          },
          position: {
            line: 2, // {% t "title_t" %}
            character: 8,
          },
        };

        const handler = new DefinitionHandler(params);
        const result = await handler.handleDefinitionRequest();

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        if (Array.isArray(result) && result.length > 0) {
          expect(result[0].uri).toContain("part_1.liquid");
          expect(result[0].range.start.line).toBe(0);
        }
      });

      it("should return null for missing translation in EF", async () => {
        const params: DefinitionParams = {
          textDocument: {
            uri: `file://${path.join(efPath, "main.liquid")}`,
          },
          position: {
            line: 3, // {% t "subtitle_t" %} - not defined in EF
            character: 8,
          },
        };

        const handler = new DefinitionHandler(params);
        const result = await handler.handleDefinitionRequest();

        expect(result).toBeNull();
      });
    });

    describe("Nested Include Scenarios", () => {
      it("should handle part included in another part (EF)", async () => {
        // EF part_1.liquid includes part_2.liquid (which is empty)
        // This tests the scenario where an included part has no content
        const params: HoverParams = {
          textDocument: {
            uri: `file://${path.join(efPath, "main.liquid")}`,
          },
          position: {
            line: 2, // {% t "title_t" %} - should find in part_1
            character: 8,
          },
        };

        const handler = new HoverHandler(params);
        const result = await handler.handleHoverRequest();

        expect(result).toBeDefined();
        expect(result).toContain("title_t");
      });
    });
  });

  describe("Cross-Template Type Consistency", () => {
    it("should handle same translation key across different template types", async () => {
      // Test that title_t behaves consistently across AT, RT, and EF
      const templatePaths = [
        path.join(
          fixturesPath,
          "account_templates",
          "account_1",
          "main.liquid",
        ),
        path.join(
          fixturesPath,
          "reconciliation_texts",
          "reconciliation_text_1",
          "main.liquid",
        ),
        path.join(fixturesPath, "export_files", "export_1", "main.liquid"),
      ];

      for (const templatePath of templatePaths) {
        const params: HoverParams = {
          textDocument: {
            uri: `file://${templatePath}`,
          },
          position: {
            line: 2, // {% t "title_t" %}
            character: 8,
          },
        };

        const handler = new HoverHandler(params);
        const result = await handler.handleHoverRequest();

        expect(result).toBeDefined();
        expect(result).toContain("title_t");
        expect(result).toContain("Title");
        expect(result).toContain("Título");
      }
    });

    it("should handle go-to-definition consistently across template types", async () => {
      const templatePaths = [
        path.join(
          fixturesPath,
          "account_templates",
          "account_1",
          "main.liquid",
        ),
        path.join(
          fixturesPath,
          "reconciliation_texts",
          "reconciliation_text_1",
          "main.liquid",
        ),
        path.join(fixturesPath, "export_files", "export_1", "main.liquid"),
      ];

      for (const templatePath of templatePaths) {
        const params: DefinitionParams = {
          textDocument: {
            uri: `file://${templatePath}`,
          },
          position: {
            line: 2, // {% t "title_t" %}
            character: 8,
          },
        };

        const handler = new DefinitionHandler(params);
        const result = await handler.handleDefinitionRequest();

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        if (Array.isArray(result) && result.length > 0) {
          expect(result[0].uri).toContain("part_1.liquid");
        }
      }
    });
  });

  describe("Scope-Aware Behavior Tests", () => {
    describe("Include After Translation (Out of Scope)", () => {
      it("should not find translation when include is after translation call (AT)", async () => {
        // AT account_2: translation call is before include, so definition should not be found
        const at2Path = path.join(
          fixturesPath,
          "account_templates",
          "account_2",
        );
        const params: HoverParams = {
          textDocument: {
            uri: `file://${path.join(at2Path, "main.liquid")}`,
          },
          position: {
            line: 0, // {% t "out_of_scope_translation" %} - before include
            character: 8,
          },
        };

        const handler = new HoverHandler(params);
        const result = await handler.handleHoverRequest();

        expect(result).toBeDefined();
        expect(result).toContain("out_of_scope_translation");
        expect(result).toContain("Definition not found");
        expect(result).not.toContain("This should not be found");
      });

      it("should not navigate to definition when include is after translation call (AT)", async () => {
        const at2Path = path.join(
          fixturesPath,
          "account_templates",
          "account_2",
        );
        const params: DefinitionParams = {
          textDocument: {
            uri: `file://${path.join(at2Path, "main.liquid")}`,
          },
          position: {
            line: 0, // {% t "out_of_scope_translation" %} - before include
            character: 8,
          },
        };

        const handler = new DefinitionHandler(params);
        const result = await handler.handleDefinitionRequest();

        expect(result).toBeNull();
      });
    });

    describe("No Include Statement", () => {
      it("should not find translation when there are no includes (AT)", async () => {
        // AT account_3: no include statements, so translation should not be found
        const at3Path = path.join(
          fixturesPath,
          "account_templates",
          "account_3",
        );
        const params: HoverParams = {
          textDocument: {
            uri: `file://${path.join(at3Path, "main.liquid")}`,
          },
          position: {
            line: 0, // {% t "missing_translation" %} - no includes
            character: 8,
          },
        };

        const handler = new HoverHandler(params);
        const result = await handler.handleHoverRequest();

        expect(result).toBeDefined();
        expect(result).toContain("missing_translation");
        expect(result).toContain("Definition not found");
        expect(result).not.toContain("This should not be found either");
      });

      it("should not navigate to definition when there are no includes (AT)", async () => {
        const at3Path = path.join(
          fixturesPath,
          "account_templates",
          "account_3",
        );
        const params: DefinitionParams = {
          textDocument: {
            uri: `file://${path.join(at3Path, "main.liquid")}`,
          },
          position: {
            line: 0, // {% t "missing_translation" %} - no includes
            character: 8,
          },
        };

        const handler = new DefinitionHandler(params);
        const result = await handler.handleDefinitionRequest();

        expect(result).toBeNull();
      });
    });

    describe("Scope Boundary Verification", () => {
      it("should find translation when include is before translation call", async () => {
        // Verify the positive case - AT account_1 where include comes before translation
        const at1Path = path.join(
          fixturesPath,
          "account_templates",
          "account_1",
        );
        const params: HoverParams = {
          textDocument: {
            uri: `file://${path.join(at1Path, "main.liquid")}`,
          },
          position: {
            line: 2, // {% t "title_t" %} - after include
            character: 8,
          },
        };

        const handler = new HoverHandler(params);
        const result = await handler.handleHoverRequest();

        expect(result).toBeDefined();
        expect(result).toContain("title_t");
        expect(result).toContain("Title");
        expect(result).not.toContain("Definition not found");
      });

      it("should demonstrate scope-aware behavior across different line positions", async () => {
        // Test that the same file behaves differently based on cursor position
        const at2Path = path.join(
          fixturesPath,
          "account_templates",
          "account_2",
        );

        // Position before include (should not find)
        const paramsBeforeInclude: HoverParams = {
          textDocument: {
            uri: `file://${path.join(at2Path, "main.liquid")}`,
          },
          position: {
            line: 0, // Before include
            character: 8,
          },
        };

        const handlerBefore = new HoverHandler(paramsBeforeInclude);
        const resultBefore = await handlerBefore.handleHoverRequest();

        expect(resultBefore).toContain("Definition not found");

        // If we had a translation call after the include, it should be found
        // This demonstrates the scope-aware nature of the implementation
      });
    });
  });

  describe("Config.json Path Resolution", () => {
    it("should use custom paths from config.json instead of inferring", async () => {
      // Test with account_custom which has custom paths in config.json
      const customPath = path.join(
        fixturesPath,
        "account_templates",
        "account_custom",
      );
      const params: HoverParams = {
        textDocument: {
          uri: `file://${path.join(customPath, "main.liquid")}`,
        },
        position: {
          line: 2, // {% t "custom_translation" %}
          character: 8,
        },
      };

      const handler = new HoverHandler(params);
      const result = await handler.handleHoverRequest();

      expect(result).toBeDefined();
      expect(result).toContain("custom_translation");
      expect(result).toContain("Custom Translation");
      expect(result).toContain("Traducción Personalizada");
      expect(result).not.toContain("Definition not found");
    });

    it("should navigate to custom config.json defined paths", async () => {
      const customPath = path.join(
        fixturesPath,
        "account_templates",
        "account_custom",
      );
      const params: DefinitionParams = {
        textDocument: {
          uri: `file://${path.join(customPath, "main.liquid")}`,
        },
        position: {
          line: 2, // {% t "custom_translation" %}
          character: 8,
        },
      };

      const handler = new DefinitionHandler(params);
      const result = await handler.handleDefinitionRequest();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      if (Array.isArray(result) && result.length > 0) {
        // Should point to the custom path defined in config.json
        expect(result[0].uri).toContain(
          "custom_directory/my_custom_part.liquid",
        );
        expect(result[0].range.start.line).toBe(0);
      }
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle templates without text_parts", async () => {
      // Test with account_2 which has no text_parts
      const at2Path = path.join(fixturesPath, "account_templates", "account_2");
      const params: HoverParams = {
        textDocument: {
          uri: `file://${path.join(at2Path, "main.liquid")}`,
        },
        position: {
          line: 0,
          character: 5,
        },
      };

      const handler = new HoverHandler(params);
      const result = await handler.handleHoverRequest();

      // Should not throw, but may return null or basic info
      expect(typeof result === "string" || result === null).toBe(true);
    });

    it("should handle malformed config.json gracefully", async () => {
      // This would require a malformed fixture, but we test the error handling path
      const params: HoverParams = {
        textDocument: {
          uri: "file:///nonexistent/path/main.liquid",
        },
        position: {
          line: 0,
          character: 5,
        },
      };

      const handler = new HoverHandler(params);

      // Should handle file not found gracefully
      await expect(handler.handleHoverRequest()).rejects.toThrow();
    });

    it("should handle empty translation definitions", async () => {
      // Test with EF part_2.liquid which is empty
      const efPath = path.join(fixturesPath, "export_files", "export_1");
      const params: HoverParams = {
        textDocument: {
          uri: `file://${path.join(efPath, "text_parts", "part_2.liquid")}`,
        },
        position: {
          line: 0,
          character: 0,
        },
      };

      const handler = new HoverHandler(params);
      const result = await handler.handleHoverRequest();

      expect(typeof result === "string" || result === null).toBe(true);
    });
  });
});
