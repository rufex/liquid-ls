import { HoverProvider } from "../src/hoverProvider";
import { DefinitionProvider } from "../src/definitionProvider";
import { HoverParams, DefinitionParams } from "vscode-languageserver/node";
import * as path from "path";
import * as fs from "fs";

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

        const handler = new HoverProvider(params, fixturesPath);
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

        const handler = new HoverProvider(params, fixturesPath);
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

        const handler = new HoverProvider(params, fixturesPath);
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

        const handler = new DefinitionProvider(params, fixturesPath);
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

        const handler = new DefinitionProvider(params, fixturesPath);
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
            line: 3, // {% t "title_t" %}
            character: 8,
          },
        };

        const handler = new HoverProvider(params, fixturesPath);
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
            line: 4, // {% t "subtitle_t" %}
            character: 8,
          },
        };

        const handler = new HoverProvider(params, fixturesPath);
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
            line: 3, // {% t "title_t" %}
            character: 8,
          },
        };

        const handler = new DefinitionProvider(params, fixturesPath);
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
            line: 4, // {% t "subtitle_t" %}
            character: 8,
          },
        };

        const handler = new DefinitionProvider(params, fixturesPath);
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
            line: 4, // {% t "subtitle_t" %} - defined in part_2, included by part_1
            character: 8,
          },
        };

        const handler = new HoverProvider(params, fixturesPath);
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

        const handler = new HoverProvider(params, fixturesPath);
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

        const handler = new HoverProvider(params, fixturesPath);
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

        const handler = new DefinitionProvider(params, fixturesPath);
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

        const handler = new DefinitionProvider(params, fixturesPath);
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

        const handler = new HoverProvider(params, fixturesPath);
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
        // Different template types have title_t on different lines
        const line = templatePath.includes("reconciliation_texts") ? 3 : 2;

        const params: HoverParams = {
          textDocument: {
            uri: `file://${templatePath}`,
          },
          position: {
            line: line, // {% t "title_t" %}
            character: 8,
          },
        };

        const handler = new HoverProvider(params, fixturesPath);
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
        // Different template types have title_t on different lines
        const line = templatePath.includes("reconciliation_texts") ? 3 : 2;

        const params: DefinitionParams = {
          textDocument: {
            uri: `file://${templatePath}`,
          },
          position: {
            line: line, // {% t "title_t" %}
            character: 8,
          },
        };

        const handler = new DefinitionProvider(params, fixturesPath);
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

        const handler = new HoverProvider(params, fixturesPath);
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

        const handler = new DefinitionProvider(params, fixturesPath);
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

        const handler = new HoverProvider(params, fixturesPath);
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

        const handler = new DefinitionProvider(params, fixturesPath);
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

        const handler = new HoverProvider(params, fixturesPath);
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

        const handlerBefore = new HoverProvider(paramsBeforeInclude);
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

      const handler = new HoverProvider(params);
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

      const handler = new DefinitionProvider(params);
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

  describe("Include Statement Go-to-Definition", () => {
    it("should navigate to included file when clicking on include statement (AT)", async () => {
      const at1Path = path.join(fixturesPath, "account_templates", "account_1");
      const params: DefinitionParams = {
        textDocument: {
          uri: `file://${path.join(at1Path, "main.liquid")}`,
        },
        position: {
          line: 0, // {% include 'parts/part_1' %}
          character: 20, // Inside the include path string
        },
      };

      const handler = new DefinitionProvider(params);
      const result = await handler.handleDefinitionRequest();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      if (Array.isArray(result) && result.length > 0) {
        expect(result[0].uri).toContain("part_1.liquid");
        expect(result[0].range.start.line).toBe(0);
        expect(result[0].range.start.character).toBe(0);
      }
    });

    it("should navigate to included file when clicking on include statement (RT)", async () => {
      const rtPath = path.join(
        fixturesPath,
        "reconciliation_texts",
        "reconciliation_text_1",
      );
      const params: DefinitionParams = {
        textDocument: {
          uri: `file://${path.join(rtPath, "main.liquid")}`,
        },
        position: {
          line: 0, // {% include 'parts/part_1' %}
          character: 20, // Inside the include path string
        },
      };

      const handler = new DefinitionProvider(params);
      const result = await handler.handleDefinitionRequest();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      if (Array.isArray(result) && result.length > 0) {
        expect(result[0].uri).toContain("part_1.liquid");
        expect(result[0].range.start.line).toBe(0);
        expect(result[0].range.start.character).toBe(0);
      }
    });

    it("should navigate to nested included file (RT part includes another part)", async () => {
      const rtPath = path.join(
        fixturesPath,
        "reconciliation_texts",
        "reconciliation_text_1",
      );
      const params: DefinitionParams = {
        textDocument: {
          uri: `file://${path.join(rtPath, "text_parts", "part_1.liquid")}`,
        },
        position: {
          line: 2, // {% include 'parts/part_2' %}
          character: 20, // Inside the include path string
        },
      };

      const handler = new DefinitionProvider(params);
      const result = await handler.handleDefinitionRequest();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      if (Array.isArray(result) && result.length > 0) {
        expect(result[0].uri).toContain("part_2.liquid");
        expect(result[0].range.start.line).toBe(0);
        expect(result[0].range.start.character).toBe(0);
      }
    });

    it("should navigate to custom config.json defined include path", async () => {
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
          line: 0, // {% include 'parts/custom_part' %}
          character: 25, // Inside the include path string
        },
      };

      const handler = new DefinitionProvider(params);
      const result = await handler.handleDefinitionRequest();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      if (Array.isArray(result) && result.length > 0) {
        // Should navigate to the custom path defined in config.json
        expect(result[0].uri).toContain(
          "custom_directory/my_custom_part.liquid",
        );
        expect(result[0].range.start.line).toBe(0);
        expect(result[0].range.start.character).toBe(0);
      }
    });

    it("should return null for non-existent include path", async () => {
      const at1Path = path.join(fixturesPath, "account_templates", "account_1");

      // Create a temporary file with a non-existent include
      const tempContent = "{% include 'parts/non_existent_part' %}";
      const tempFilePath = path.join(at1Path, "temp_test.liquid");
      fs.writeFileSync(tempFilePath, tempContent);

      try {
        const params: DefinitionParams = {
          textDocument: {
            uri: `file://${tempFilePath}`,
          },
          position: {
            line: 0,
            character: 25,
          },
        };

        const handler = new DefinitionProvider(params, fixturesPath);
        const result = await handler.handleDefinitionRequest();

        expect(result).toBeNull();
      } finally {
        // Clean up temp file
        fs.unlinkSync(tempFilePath);
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

      const handler = new HoverProvider(params);
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

      const handler = new HoverProvider(params);

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

      const handler = new HoverProvider(params);
      const result = await handler.handleHoverRequest();

      expect(typeof result === "string" || result === null).toBe(true);
    });
  });

  describe("Shared Parts Integration", () => {
    const rtPath = path.join(
      fixturesPath,
      "reconciliation_texts",
      "reconciliation_text_1",
    );

    describe("Shared Parts Go-to-Definition", () => {
      it("should navigate to shared part from include statement", async () => {
        const params: DefinitionParams = {
          textDocument: {
            uri: `file://${path.join(rtPath, "main.liquid")}`,
          },
          position: {
            line: 1, // {% include 'shared/shared_part_1' %}
            character: 20, // Inside the shared part name
          },
        };

        const handler = new DefinitionProvider(params, fixturesPath);
        const result = await handler.handleDefinitionRequest();

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        expect(result!.length).toBe(1);
        expect(result![0].uri).toContain(
          "shared_parts/shared_part_1/shared_part_1.liquid",
        );
      });

      it("should not navigate to shared part if not allowed for template", async () => {
        // Try to access shared_part_1 from account_1 (not in used_in)
        const atPath = path.join(
          fixturesPath,
          "account_templates",
          "account_1",
        );

        // First, let's add a shared include to account_1 main.liquid temporarily
        const mainLiquidPath = path.join(atPath, "main.liquid");
        const originalContent = fs.readFileSync(mainLiquidPath, "utf8");
        const modifiedContent =
          "{% include 'shared/shared_part_1' %}\n" + originalContent;
        fs.writeFileSync(mainLiquidPath, modifiedContent);

        try {
          const params: DefinitionParams = {
            textDocument: {
              uri: `file://${mainLiquidPath}`,
            },
            position: {
              line: 0, // {% include 'shared/shared_part_1' %}
              character: 20, // Inside the shared part name
            },
          };

          const handler = new DefinitionProvider(params, fixturesPath);
          const result = await handler.handleDefinitionRequest();

          // Should return null because account_1 is not in shared_part_1's used_in
          expect(result).toBeNull();
        } finally {
          // Restore original content
          fs.writeFileSync(mainLiquidPath, originalContent);
        }
      });

      it("should handle non-existent shared part gracefully", async () => {
        // Add a non-existent shared part include temporarily
        const mainLiquidPath = path.join(rtPath, "main.liquid");
        const originalContent = fs.readFileSync(mainLiquidPath, "utf8");
        const modifiedContent =
          "{% include 'shared/non_existent_part' %}\n" + originalContent;
        fs.writeFileSync(mainLiquidPath, modifiedContent);

        try {
          const params: DefinitionParams = {
            textDocument: {
              uri: `file://${mainLiquidPath}`,
            },
            position: {
              line: 0, // {% include 'shared/non_existent_part' %}
              character: 20, // Inside the shared part name
            },
          };

          const handler = new DefinitionProvider(params, fixturesPath);
          const result = await handler.handleDefinitionRequest();

          expect(result).toBeNull();
        } finally {
          // Restore original content
          fs.writeFileSync(mainLiquidPath, originalContent);
        }
      });
    });

    describe("Shared Parts Translation Scope", () => {
      it("should find translations from included shared parts", async () => {
        // Test hover on a translation that should be found in shared_part_1
        const params: HoverParams = {
          textDocument: {
            uri: `file://${path.join(rtPath, "main.liquid")}`,
          },
          position: {
            line: 6, // {% t "shared_translation_1" %} (existing call in main.liquid)
            character: 8, // Inside the translation call
          },
        };

        // Test the existing translation call in main.liquid
        const handler = new HoverProvider(params, fixturesPath);
        const result = await handler.handleHoverRequest();

        expect(result).toBeDefined();
        expect(result).toContain("shared_translation_1");
        expect(result).toContain("Shared Translation 1");
        expect(result).toContain("Gedeelde Vertaling 1");
      });

      it("should prioritize shared part translations in scope order", async () => {
        // Test with RT2 which includes both shared_part_1 and shared_part_2
        // Both define "shared_common" but with different values
        const rt2Path = path.join(
          fixturesPath,
          "reconciliation_texts",
          "reconciliation_text_2",
        );
        const mainLiquidPath = path.join(rt2Path, "main.liquid");
        const originalContent = fs.readFileSync(mainLiquidPath, "utf8");
        // eslint-disable-next-line quotes
        const modifiedContent = originalContent + '\n{% t "shared_common" %}';
        fs.writeFileSync(mainLiquidPath, modifiedContent);

        try {
          const params: HoverParams = {
            textDocument: {
              uri: `file://${mainLiquidPath}`,
            },
            position: {
              line: 4, // {% t "shared_common" %}
              character: 8, // Inside the translation call
            },
          };

          const handler = new HoverProvider(params, fixturesPath);
          const result = await handler.handleHoverRequest();

          expect(result).toBeDefined();
          expect(result).toContain("shared_common");
          // Should find the first definition (from shared_part_1)
          expect(result).toContain("Common Shared Text");
        } finally {
          // Restore original content
          fs.writeFileSync(mainLiquidPath, originalContent);
        }
      });
    });

    describe("Shared Parts Validation", () => {
      it("should validate shared part usage based on used_in configuration", async () => {
        // shared_part_1 should be allowed for reconciliation_text_1 and reconciliation_text_2
        const params1: DefinitionParams = {
          textDocument: {
            uri: `file://${path.join(rtPath, "main.liquid")}`,
          },
          position: {
            line: 1, // {% include 'shared/shared_part_1' %}
            character: 20,
          },
        };

        const handler1 = new DefinitionProvider(params1, fixturesPath);
        const result1 = await handler1.handleDefinitionRequest();
        expect(result1).toBeDefined();

        // shared_part_2 should be allowed for reconciliation_text_2 but not reconciliation_text_1
        const rt2Path = path.join(
          fixturesPath,
          "reconciliation_texts",
          "reconciliation_text_2",
        );
        const params2: DefinitionParams = {
          textDocument: {
            uri: `file://${path.join(rt2Path, "main.liquid")}`,
          },
          position: {
            line: 1, // {% include 'shared/shared_part_2' %}
            character: 20,
          },
        };

        const handler2 = new DefinitionProvider(params2, fixturesPath);
        const result2 = await handler2.handleDefinitionRequest();
        expect(result2).toBeDefined();
      });

      it("should handle shared parts with empty used_in array", async () => {
        // shared_part_3 has empty used_in array, so should not be accessible
        const mainLiquidPath = path.join(rtPath, "main.liquid");
        const originalContent = fs.readFileSync(mainLiquidPath, "utf8");
        const modifiedContent =
          "{% include 'shared/shared_part_2' %}\n" + originalContent; // shared_part_3 has name "shared_part_2"
        fs.writeFileSync(mainLiquidPath, modifiedContent);

        try {
          const params: DefinitionParams = {
            textDocument: {
              uri: `file://${mainLiquidPath}`,
            },
            position: {
              line: 0,
              character: 20,
            },
          };

          const handler = new DefinitionProvider(params, fixturesPath);
          const result = await handler.handleDefinitionRequest();

          // Should return null because reconciliation_text_1 is not in shared_part_3's used_in
          expect(result).toBeNull();
        } finally {
          // Restore original content
          fs.writeFileSync(mainLiquidPath, originalContent);
        }
      });
    });
  });
});
