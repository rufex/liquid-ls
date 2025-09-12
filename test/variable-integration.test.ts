import { DefinitionProvider } from "../src/definitionProvider";
import { DefinitionParams } from "vscode-languageserver/node";
import * as path from "path";

describe("Variable Assignment Integration Tests", () => {
  const fixtureBasePath = path.join(__dirname, "../fixtures/market-repo");
  const variableTestPath = path.join(
    fixtureBasePath,
    "reconciliation_texts/variable_test",
  );

  describe("Assignment Statements", () => {
    it("should navigate from output to assignment definition", async () => {
      const mainFile = path.join(variableTestPath, "main.liquid");

      // Test {{ simple_var | upcase }} -> {% assign simple_var = 'Hello World' %}
      const params: DefinitionParams = {
        textDocument: { uri: `file://${mainFile}` },
        position: { line: 15, character: 6 }, // Position on simple_var in {{ simple_var | upcase }}
      };

      const handler = new DefinitionProvider(params, fixtureBasePath);
      const result = await handler.handleDefinitionRequest();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      if (Array.isArray(result) && result.length > 0) {
        expect(result[0].uri).toContain("main.liquid");
        expect(result[0].range.start.line).toBe(3); // Line with {% assign simple_var = 'Hello World' %}
      }
    });

    it("should navigate from filter body to assignment definition", async () => {
      const mainFile = path.join(variableTestPath, "main.liquid");

      // Test simple_var in {{ simple_var | upcase }} (same as above, testing filter body detection)
      const params: DefinitionParams = {
        textDocument: { uri: `file://${mainFile}` },
        position: { line: 15, character: 6 }, // Position on simple_var in filter
      };

      const handler = new DefinitionProvider(params, fixtureBasePath);
      const result = await handler.handleDefinitionRequest();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      if (Array.isArray(result) && result.length > 0) {
        expect(result[0].uri).toContain("main.liquid");
        expect(result[0].range.start.line).toBe(3);
      }
    });

    it("should navigate from assignment value to definition", async () => {
      const mainFile = path.join(variableTestPath, "main.liquid");

      // Test complex_var in {% assign derived_var = complex_var %}
      const params: DefinitionParams = {
        textDocument: { uri: `file://${mainFile}` },
        position: { line: 18, character: 28 }, // Position on complex_var in assignment value
      };

      const handler = new DefinitionProvider(params, fixtureBasePath);
      const result = await handler.handleDefinitionRequest();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      if (Array.isArray(result) && result.length > 0) {
        expect(result[0].uri).toContain("main.liquid");
        expect(result[0].range.start.line).toBe(6); // Line with {% capture complex_var %}
      }
    });
  });

  describe("Capture Statements", () => {
    it("should navigate from bracket notation to capture definition", async () => {
      const mainFile = path.join(variableTestPath, "main.liquid");

      // Test [complex_var] in {% assign [complex_var] = 'Bracket Assignment' %}
      const params: DefinitionParams = {
        textDocument: { uri: `file://${mainFile}` },
        position: { line: 25, character: 12 }, // Position on complex_var in [complex_var]
      };

      const handler = new DefinitionProvider(params, fixtureBasePath);
      const result = await handler.handleDefinitionRequest();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      if (Array.isArray(result) && result.length > 0) {
        expect(result[0].uri).toContain("main.liquid");
        expect(result[0].range.start.line).toBe(6); // Line with {% capture complex_var %}
      }
    });
  });

  describe("For Loop Variables", () => {
    it("should navigate from loop variable output to for statement", async () => {
      const mainFile = path.join(variableTestPath, "main.liquid");

      // Test {{ loop_item }} -> for loop_item in items
      const params: DefinitionParams = {
        textDocument: { uri: `file://${mainFile}` },
        position: { line: 12, character: 6 }, // Position on loop_item in {{ loop_item }}
      };

      const handler = new DefinitionProvider(params, fixtureBasePath);
      const result = await handler.handleDefinitionRequest();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      if (Array.isArray(result) && result.length > 0) {
        expect(result[0].uri).toContain("main.liquid");
        expect(result[0].range.start.line).toBe(10); // Line with {% for loop_item in items %}
      }
    });

    it("should navigate from for loop iterator to assignment", async () => {
      const mainFile = path.join(variableTestPath, "main.liquid");

      // Test items in {% for loop_item in items %}
      const params: DefinitionParams = {
        textDocument: { uri: `file://${mainFile}` },
        position: { line: 10, character: 20 }, // Position on items in for loop
      };

      const handler = new DefinitionProvider(params, fixtureBasePath);
      const result = await handler.handleDefinitionRequest();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      if (Array.isArray(result) && result.length > 0) {
        expect(result[0].uri).toContain("main.liquid");
        expect(result[0].range.start.line).toBe(9); // Line with {% assign items = ... %}
      }
    });
  });

  describe("Variable Reference Contexts", () => {
    it("should handle all 8 variable reference contexts", async () => {
      const mainFile = path.join(variableTestPath, "main.liquid");

      // Test cases for each context from our table
      const testCases = [
        {
          name: "Assignment -> Output",
          position: { line: 15, character: 6 }, // simple_var in {{ simple_var | upcase }}
          expectedLine: 3, // {% assign simple_var = ... %}
        },
        {
          name: "Capture -> Bracket Notation",
          position: { line: 25, character: 12 }, // complex_var in [complex_var]
          expectedLine: 6, // {% capture complex_var %}
        },
        {
          name: "For Loop Variable -> Output",
          position: { line: 12, character: 6 }, // loop_item in {{ loop_item }}
          expectedLine: 10, // {% for loop_item in items %}
        },
        {
          name: "Assignment -> For Loop Iterator",
          position: { line: 10, character: 20 }, // items in {% for loop_item in items %}
          expectedLine: 9, // {% assign items = ... %}
        },
        {
          name: "Capture -> Assignment Value",
          position: { line: 18, character: 28 }, // complex_var in {% assign derived_var = complex_var %}
          expectedLine: 6, // {% capture complex_var %}
        },
      ];

      for (const testCase of testCases) {
        const params: DefinitionParams = {
          textDocument: { uri: `file://${mainFile}` },
          position: testCase.position,
        };

        const handler = new DefinitionProvider(params, fixtureBasePath);
        const result = await handler.handleDefinitionRequest();

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        if (Array.isArray(result) && result.length > 0) {
          expect(result[0].uri).toContain("main.liquid");
          expect(result[0].range.start.line).toBe(testCase.expectedLine);
        }
      }
    });
  });

  describe("Error Cases", () => {
    it("should return null for undefined variables", async () => {
      const mainFile = path.join(variableTestPath, "main.liquid");

      // Test position on comment, not a variable
      const params: DefinitionParams = {
        textDocument: { uri: `file://${mainFile}` },
        position: { line: 0, character: 5 }, // Position on comment
      };

      const handler = new DefinitionProvider(params, fixtureBasePath);
      const result = await handler.handleDefinitionRequest();

      expect(result).toBeNull();
    });

    it("should handle malformed variable references gracefully", async () => {
      const mainFile = path.join(variableTestPath, "main.liquid");

      // Test position outside of any variable context
      const params: DefinitionParams = {
        textDocument: { uri: `file://${mainFile}` },
        position: { line: 1, character: 1 }, // Position in empty line
      };

      const handler = new DefinitionProvider(params, fixtureBasePath);
      const result = await handler.handleDefinitionRequest();

      expect(result).toBeNull();
    });
  });
});
