import { DefinitionHandler } from "../src/definitionHandler";
import { DefinitionParams } from "vscode-languageserver/node";
import * as fs from "fs";
import { URI } from "vscode-uri";

jest.mock("fs");
jest.mock("vscode-uri");

// Mock the TreeSitterLiquidProvider
const mockParseText = jest.fn();
const mockGetTranslationKeyAtPosition = jest.fn();
const mockFindTranslationDefinitionByKey = jest.fn();
const mockGetTranslationKeyLocation = jest.fn();
const mockGetIncludePathAtPosition = jest.fn();
const mockGetVariableAtPosition = jest.fn();
const mockFindVariableDefinitionByName = jest.fn();
const mockGetVariableNameLocation = jest.fn();

jest.mock("../src/treeSitterLiquidProvider", () => ({
  TreeSitterLiquidProvider: jest.fn().mockImplementation(() => ({
    parseText: mockParseText,
    getTranslationKeyAtPosition: mockGetTranslationKeyAtPosition,
    findTranslationDefinitionByKey: mockFindTranslationDefinitionByKey,
    getTranslationKeyLocation: mockGetTranslationKeyLocation,
    getIncludePathAtPosition: mockGetIncludePathAtPosition,
    getVariableAtPosition: mockGetVariableAtPosition,
    findVariableDefinitionByName: mockFindVariableDefinitionByName,
    getVariableNameLocation: mockGetVariableNameLocation,
  })),
}));

// Mock the ScopeAwareProvider
const mockFindScopedTranslationDefinition = jest.fn();
const mockFindScopedVariableDefinition = jest.fn();

jest.mock("../src/scopeAwareProvider", () => ({
  ScopeAwareProvider: jest.fn().mockImplementation(() => ({
    findScopedTranslationDefinition: mockFindScopedTranslationDefinition,
    findScopedVariableDefinition: mockFindScopedVariableDefinition,
  })),
}));

describe("DefinitionHandler", () => {
  let mockParams: DefinitionParams;
  let mockFs: jest.Mocked<typeof fs>;
  let mockURI: jest.Mocked<typeof URI>;

  beforeEach(() => {
    mockParams = {
      textDocument: {
        uri: "file:///test.liquid",
      },
      position: {
        line: 0,
        character: 10,
      },
    };

    mockFs = fs as jest.Mocked<typeof fs>;
    mockURI = URI as jest.Mocked<typeof URI>;

    // Setup default mocks
    mockURI.parse = jest.fn().mockReturnValue({
      fsPath: "/test.liquid",
    });

    // Reset provider mocks
    mockParseText.mockReturnValue({
      rootNode: {
        descendantForPosition: jest.fn().mockReturnValue({
          text: "test",
          type: "test_node",
        }),
      },
    });
    mockGetTranslationKeyAtPosition.mockReturnValue(null);
    mockFindTranslationDefinitionByKey.mockReturnValue(null);
    mockGetTranslationKeyLocation.mockReturnValue(null);
    mockGetIncludePathAtPosition.mockReturnValue(null);

    // Reset ScopeAwareProvider mocks
    mockFindScopedTranslationDefinition.mockReturnValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("initialization", () => {
    it("should create a definition handler instance", () => {
      const handler = new DefinitionHandler(mockParams);
      expect(handler).toBeDefined();
      expect(handler).toBeInstanceOf(DefinitionHandler);
    });
  });

  describe("handleDefinitionRequest", () => {
    it("should return null when document is not found", async () => {
      mockFs.readFileSync = jest.fn().mockReturnValue("");

      const handler = new DefinitionHandler(mockParams);
      const result = await handler.handleDefinitionRequest();

      expect(result).toBeNull();
    });

    it("should return null when parsing fails", async () => {
      const content = "valid content";
      mockFs.readFileSync = jest.fn().mockReturnValue(content);
      mockParseText.mockReturnValue(null);

      const handler = new DefinitionHandler(mockParams);
      const result = await handler.handleDefinitionRequest();

      expect(result).toBeNull();
    });

    it("should return null when position is not on translation call", async () => {
      const content = "<h1>Hello World</h1>";
      mockFs.readFileSync = jest.fn().mockReturnValue(content);
      mockParseText.mockReturnValue({ rootNode: {} });
      mockGetTranslationKeyAtPosition.mockReturnValue(null);

      const handler = new DefinitionHandler(mockParams);
      const result = await handler.handleDefinitionRequest();

      expect(result).toBeNull();
    });

    it("should return null when translation definition is not found", async () => {
      const content = "{% t 'missing_key' %}";
      mockFs.readFileSync = jest.fn().mockReturnValue(content);
      mockParseText.mockReturnValue({ rootNode: {} });
      mockGetTranslationKeyAtPosition.mockReturnValue("missing_key");
      mockFindScopedTranslationDefinition.mockReturnValue(null);

      const handler = new DefinitionHandler(mockParams);
      const result = await handler.handleDefinitionRequest();

      expect(result).toBeNull();
    });

    it("should return location when translation definition is found", async () => {
      const content = "{% t 'test_key' %}";
      mockFs.readFileSync = jest.fn().mockReturnValue(content);
      mockParseText.mockReturnValue({ rootNode: {} });
      mockGetTranslationKeyAtPosition.mockReturnValue("test_key");
      mockFindScopedTranslationDefinition.mockReturnValue({
        definition: {
          startPosition: { row: 1, column: 5 },
          endPosition: { row: 1, column: 15 },
        },
        filePath: "/test.liquid",
        content: "test content",
      });
      mockGetTranslationKeyLocation.mockReturnValue({
        startPosition: { row: 1, column: 6 },
        endPosition: { row: 1, column: 14 },
      });

      const handler = new DefinitionHandler(mockParams);
      const result = await handler.handleDefinitionRequest();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result![0]).toHaveProperty("uri", "file:///test.liquid");
      expect(result![0]).toHaveProperty("range");
      expect(result![0].range.start).toEqual({ line: 1, character: 6 });
      expect(result![0].range.end).toEqual({ line: 1, character: 14 });
    });

    it("should fallback to definition node when key location not found", async () => {
      const content = "{% t 'test_key' %}";
      mockFs.readFileSync = jest.fn().mockReturnValue(content);
      mockParseText.mockReturnValue({ rootNode: {} });
      mockGetTranslationKeyAtPosition.mockReturnValue("test_key");
      mockFindScopedTranslationDefinition.mockReturnValue({
        definition: {
          startPosition: { row: 1, column: 5 },
          endPosition: { row: 1, column: 15 },
        },
        filePath: "/test.liquid",
        content: "test content",
      });
      mockGetTranslationKeyLocation.mockReturnValue(null);

      const handler = new DefinitionHandler(mockParams);
      const result = await handler.handleDefinitionRequest();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result![0].range.start).toEqual({ line: 1, character: 5 });
      expect(result![0].range.end).toEqual({ line: 1, character: 15 });
    });

    it("should handle file system errors", async () => {
      mockFs.readFileSync = jest.fn().mockImplementation(() => {
        throw new Error("File not found");
      });

      const handler = new DefinitionHandler(mockParams);

      await expect(handler.handleDefinitionRequest()).rejects.toThrow(
        "File not found",
      );
    });
  });

  describe("variable definition handling", () => {
    beforeEach(() => {
      mockURI.parse = jest.fn().mockReturnValue({
        fsPath: "/test.liquid",
      });
      mockGetIncludePathAtPosition.mockReturnValue(null);
      mockGetTranslationKeyAtPosition.mockReturnValue(null);
    });

    it("should find variable definition for assignment", async () => {
      const content = "{% assign foo = 'bar' %}\n{{ foo }}";
      mockFs.readFileSync = jest.fn().mockReturnValue(content);
      mockParseText.mockReturnValue({ rootNode: {} });
      mockGetVariableAtPosition.mockReturnValue("foo");

      const mockDefinitionNode = {
        type: "assignment_statement",
        text: "assign foo = 'bar'",
        startPosition: { row: 0, column: 3 },
        endPosition: { row: 0, column: 21 },
      };

      mockFindScopedVariableDefinition.mockReturnValue({
        definition: mockDefinitionNode,
        filePath: "/test.liquid",
        variableName: "foo",
        lineNumber: 0,
      });

      mockGetVariableNameLocation.mockReturnValue({
        startPosition: { row: 0, column: 10 },
        endPosition: { row: 0, column: 13 },
      });

      const handler = new DefinitionHandler(mockParams);
      const result = await handler.handleDefinitionRequest();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result![0]).toHaveProperty("uri", "file:///test.liquid");
      expect(result![0]).toHaveProperty("range");
      expect(result![0].range.start).toEqual({ line: 0, character: 10 });
      expect(result![0].range.end).toEqual({ line: 0, character: 13 });
    });

    it("should find variable definition for capture", async () => {
      const content = "{% capture baz %}Text{% endcapture %}\n{{ baz }}";
      mockFs.readFileSync = jest.fn().mockReturnValue(content);
      mockParseText.mockReturnValue({ rootNode: {} });
      mockGetVariableAtPosition.mockReturnValue("baz");

      const mockDefinitionNode = {
        type: "capture_statement",
        text: "capture baz",
        startPosition: { row: 0, column: 3 },
        endPosition: { row: 0, column: 37 },
      };

      mockFindScopedVariableDefinition.mockReturnValue({
        definition: mockDefinitionNode,
        filePath: "/test.liquid",
        variableName: "baz",
        lineNumber: 0,
      });

      mockGetVariableNameLocation.mockReturnValue({
        startPosition: { row: 0, column: 11 },
        endPosition: { row: 0, column: 14 },
      });

      const handler = new DefinitionHandler(mockParams);
      const result = await handler.handleDefinitionRequest();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result![0].range.start).toEqual({ line: 0, character: 11 });
      expect(result![0].range.end).toEqual({ line: 0, character: 14 });
    });

    it("should find variable definition for for loop", async () => {
      const content = "{% for i in items %}\n{{ i }}\n{% endfor %}";
      mockFs.readFileSync = jest.fn().mockReturnValue(content);
      mockParseText.mockReturnValue({ rootNode: {} });
      mockGetVariableAtPosition.mockReturnValue("i");

      const mockDefinitionNode = {
        type: "for_loop_statement",
        text: "for i in items",
        startPosition: { row: 0, column: 3 },
        endPosition: { row: 2, column: 12 },
      };

      mockFindScopedVariableDefinition.mockReturnValue({
        definition: mockDefinitionNode,
        filePath: "/test.liquid",
        variableName: "i",
        lineNumber: 0,
      });

      mockGetVariableNameLocation.mockReturnValue({
        startPosition: { row: 0, column: 7 },
        endPosition: { row: 0, column: 8 },
      });

      const handler = new DefinitionHandler(mockParams);
      const result = await handler.handleDefinitionRequest();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result![0].range.start).toEqual({ line: 0, character: 7 });
      expect(result![0].range.end).toEqual({ line: 0, character: 8 });
    });

    it("should return null when variable not found", async () => {
      const content = "{{ nonexistent }}";
      mockFs.readFileSync = jest.fn().mockReturnValue(content);
      mockParseText.mockReturnValue({ rootNode: {} });
      mockGetVariableAtPosition.mockReturnValue("nonexistent");
      mockFindScopedVariableDefinition.mockReturnValue(null);

      const handler = new DefinitionHandler(mockParams);
      const result = await handler.handleDefinitionRequest();

      expect(result).toBeNull();
    });

    it("should fallback to definition node when variable name location not found", async () => {
      const content = "{% assign foo = 'bar' %}\n{{ foo }}";
      mockFs.readFileSync = jest.fn().mockReturnValue(content);
      mockParseText.mockReturnValue({ rootNode: {} });
      mockGetVariableAtPosition.mockReturnValue("foo");

      const mockDefinitionNode = {
        type: "assignment_statement",
        text: "assign foo = 'bar'",
        startPosition: { row: 0, column: 3 },
        endPosition: { row: 0, column: 21 },
      };

      mockFindScopedVariableDefinition.mockReturnValue({
        definition: mockDefinitionNode,
        filePath: "/test.liquid",
        variableName: "foo",
        lineNumber: 0,
      });

      mockGetVariableNameLocation.mockReturnValue(null);

      const handler = new DefinitionHandler(mockParams);
      const result = await handler.handleDefinitionRequest();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result![0].range.start).toEqual({ line: 0, character: 3 });
      expect(result![0].range.end).toEqual({ line: 0, character: 21 });
    });

    it("should return null when no variable at position", async () => {
      const content = "Hello World";
      mockFs.readFileSync = jest.fn().mockReturnValue(content);
      mockParseText.mockReturnValue({ rootNode: {} });
      mockGetVariableAtPosition.mockReturnValue(null);

      const handler = new DefinitionHandler(mockParams);
      const result = await handler.handleDefinitionRequest();

      expect(result).toBeNull();
    });

    it("should find variable definition for for loop iterator", async () => {
      const content =
        "{% assign items = 'a,b,c' | split: ',' %}\n{% for i in items %}\n{{ i }}\n{% endfor %}";
      mockFs.readFileSync = jest.fn().mockReturnValue(content);
      mockParseText.mockReturnValue({ rootNode: {} });
      mockGetVariableAtPosition.mockReturnValue("items");

      const mockDefinitionNode = {
        type: "assignment_statement",
        text: "assign items = 'a,b,c' | split: ','",
        startPosition: { row: 0, column: 3 },
        endPosition: { row: 0, column: 35 },
      };

      mockFindScopedVariableDefinition.mockReturnValue({
        definition: mockDefinitionNode,
        filePath: "/test.liquid",
        variableName: "items",
        lineNumber: 0,
      });

      mockGetVariableNameLocation.mockReturnValue({
        startPosition: { row: 0, column: 10 },
        endPosition: { row: 0, column: 15 },
      });

      const handler = new DefinitionHandler(mockParams);
      const result = await handler.handleDefinitionRequest();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result![0].range.start).toEqual({ line: 0, character: 10 });
      expect(result![0].range.end).toEqual({ line: 0, character: 15 });
    });

    it("should find variable definition for bracket notation", async () => {
      const content =
        "{% capture complex %}complex_key{% endcapture %}\n{% assign [complex] = 'Complex value' %}";
      mockFs.readFileSync = jest.fn().mockReturnValue(content);
      mockParseText.mockReturnValue({ rootNode: {} });
      mockGetVariableAtPosition.mockReturnValue("complex");

      const mockDefinitionNode = {
        type: "capture_statement",
        text: "capture complex",
        startPosition: { row: 0, column: 3 },
        endPosition: { row: 0, column: 47 },
      };

      mockFindScopedVariableDefinition.mockReturnValue({
        definition: mockDefinitionNode,
        filePath: "/test.liquid",
        variableName: "complex",
        lineNumber: 0,
      });

      mockGetVariableNameLocation.mockReturnValue({
        startPosition: { row: 0, column: 11 },
        endPosition: { row: 0, column: 18 },
      });

      const handler = new DefinitionHandler(mockParams);
      const result = await handler.handleDefinitionRequest();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result![0].range.start).toEqual({ line: 0, character: 11 });
      expect(result![0].range.end).toEqual({ line: 0, character: 18 });
    });
  });
});
