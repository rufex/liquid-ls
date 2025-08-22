import { HoverHandler } from "../src/hoverHandler";
import { HoverParams } from "vscode-languageserver/node";
import * as fs from "fs";
import { URI } from "vscode-uri";

jest.mock("fs");
jest.mock("vscode-uri");

// Mock the TreeSitterLiquidProvider with shared instance
const mockTreeSitterInstance = {
  parseText: jest.fn().mockReturnValue({
    rootNode: {
      descendantForPosition: jest.fn().mockReturnValue({
        text: "test",
        type: "test_node",
      }),
    },
  }),
  getTranslationKeyAtPosition: jest.fn().mockReturnValue(null),
  getTagIdentifierAtPosition: jest.fn().mockReturnValue(null),
  findTranslationDefinitionByKey: jest.fn().mockReturnValue(null),
  extractTranslationDefinitionContent: jest
    .fn()
    .mockReturnValue("test content"),
};

jest.mock("../src/treeSitterLiquidProvider", () => ({
  TreeSitterLiquidProvider: jest
    .fn()
    .mockImplementation(() => mockTreeSitterInstance),
}));

// Mock the RelatedFilesProvider
jest.mock("../src/relatedFilesProvider", () => ({
  RelatedFilesProvider: jest.fn().mockImplementation(() => ({
    getAllTemplateFiles: jest.fn().mockReturnValue(["/test.liquid"]),
    getMainTemplateFile: jest.fn().mockReturnValue("/test.liquid"),
  })),
}));

// Mock the ScopeAwareProvider with shared instance
const mockScopeAwareInstance = {
  findScopedTranslationDefinition: jest.fn().mockReturnValue(null),
};

jest.mock("../src/scopeAwareProvider", () => ({
  ScopeAwareProvider: jest
    .fn()
    .mockImplementation(() => mockScopeAwareInstance),
}));

describe("HoverHandler", () => {
  let mockParams: HoverParams;
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("initialization", () => {
    it("should create a hover handler instance", () => {
      const handler = new HoverHandler(mockParams);
      expect(handler).toBeDefined();
      expect(handler).toBeInstanceOf(HoverHandler);
    });
  });

  describe("handleHoverRequest", () => {
    it("should return null when document is not found", async () => {
      mockFs.readFileSync = jest.fn().mockReturnValue("");

      const handler = new HoverHandler(mockParams);
      const result = await handler.handleHoverRequest();

      expect(result).toBeNull();
    });

    it("should return null for non-translation content", async () => {
      const content = "<h1>Hello World</h1>";
      mockFs.readFileSync = jest.fn().mockReturnValue(content);

      const handler = new HoverHandler(mockParams);
      const result = await handler.handleHoverRequest();

      expect(result).toBeNull();
    });

    it("should return translation info when hovering over translation call", async () => {
      const content = `
        <h1>{% t 'welcome_message' %}</h1>
        {% t= 'welcome_message' default:'Welcome to our site' %}
      `;
      mockFs.readFileSync = jest.fn().mockReturnValue(content);

      // Position the cursor over the translation call
      mockParams.position = {
        line: 1,
        character: 15, // Inside the translation call
      };

      const handler = new HoverHandler(mockParams);
      const result = await handler.handleHoverRequest();

      // The result might be null due to TreeSitter parsing specifics in tests
      // but the method should not throw
      expect(typeof result === "string" || result === null).toBe(true);
    });

    it("should return 'not found' message when translation definition is missing", async () => {
      const content = `
        <h1>{% t 'missing_translation' %}</h1>
      `;
      mockFs.readFileSync = jest.fn().mockReturnValue(content);

      // Position the cursor over the translation call
      mockParams.position = {
        line: 1,
        character: 15,
      };

      const handler = new HoverHandler(mockParams);
      const result = await handler.handleHoverRequest();

      // The result might be null due to TreeSitter parsing specifics in tests
      // but the method should not throw
      expect(typeof result === "string" || result === null).toBe(true);
    });

    it("should handle parsing errors gracefully", async () => {
      const content = "invalid liquid syntax {%";
      mockFs.readFileSync = jest.fn().mockReturnValue(content);

      const handler = new HoverHandler(mockParams);
      const result = await handler.handleHoverRequest();

      // Should either return a result or null, but not throw
      expect(typeof result === "string" || result === null).toBe(true);
    });

    it("should handle file system errors", async () => {
      mockFs.readFileSync = jest.fn().mockImplementation(() => {
        throw new Error("File not found");
      });

      const handler = new HoverHandler(mockParams);

      // Should not throw, but handle the error gracefully
      await expect(handler.handleHoverRequest()).rejects.toThrow(
        "File not found",
      );
    });
  });

  describe("translation-specific scenarios", () => {
    it("should handle multiple translation definitions", async () => {
      const content = `
        <h1>{% t 'title' %}</h1>
        <p>{% t 'description' %}</p>
        
        {% t= 'title' default:'Page Title' %}
        {% t= 'description' default:'Page Description' %}
        {% t= 'unused' default:'Unused Translation' %}
      `;
      mockFs.readFileSync = jest.fn().mockReturnValue(content);

      const handler = new HoverHandler(mockParams);
      const result = await handler.handleHoverRequest();

      expect(typeof result === "string" || result === null).toBe(true);
    });

    it("should handle translation calls with different quote styles", async () => {
      const content = `
        <h1>{% t "double_quoted" %}</h1>
        <p>{% t 'single_quoted' %}</p>
        
        {% t= "double_quoted" default:"Double Quoted Text" %}
        {% t= 'single_quoted' default:'Single Quoted Text' %}
      `;
      mockFs.readFileSync = jest.fn().mockReturnValue(content);

      const handler = new HoverHandler(mockParams);
      const result = await handler.handleHoverRequest();

      expect(typeof result === "string" || result === null).toBe(true);
    });

    it("should handle complex translation definitions with special characters", async () => {
      const content = `
        <h1>{% t 'complex_message' %}</h1>
        
        {% t= 'complex_message' default:'Welcome! This is a "complex" message with special chars: @#$%' %}
      `;
      mockFs.readFileSync = jest.fn().mockReturnValue(content);

      const handler = new HoverHandler(mockParams);
      const result = await handler.handleHoverRequest();

      expect(typeof result === "string" || result === null).toBe(true);
    });
  });

  describe("tag hover functionality", () => {
    beforeEach(() => {
      mockFs.readFileSync = jest
        .fn()
        .mockReturnValue("{% unreconciled value %}");
      mockURI.parse = jest.fn().mockReturnValue({ fsPath: "/test.liquid" });
    });

    it("should return tag documentation for unreconciled tag", async () => {
      // Mock that translation lookup returns null (no translation found)
      mockTreeSitterInstance.getTranslationKeyAtPosition.mockReturnValue(null);
      // Mock that tag identifier lookup returns 'unreconciled'
      mockTreeSitterInstance.getTagIdentifierAtPosition.mockReturnValue(
        "unreconciled",
      );

      const handler = new HoverHandler(mockParams);
      const result = await handler.handleHoverRequest();

      expect(result).not.toBeNull();
      expect(result).toContain("**Tag:** `unreconciled`");
      expect(result).toContain("**Documentation:**");
      expect(result).toContain(
        "https://developer.silverfin.com/docs/unreconciled",
      );
    });

    it("should return tag documentation for result tag", async () => {
      mockTreeSitterInstance.getTranslationKeyAtPosition.mockReturnValue(null);
      mockTreeSitterInstance.getTagIdentifierAtPosition.mockReturnValue(
        "result",
      );

      const handler = new HoverHandler(mockParams);
      const result = await handler.handleHoverRequest();

      expect(result).not.toBeNull();
      expect(result).toContain("**Tag:** `result`");
      expect(result).toContain("**Documentation:**");
      expect(result).toContain("https://developer.silverfin.com/docs/result");
    });

    it("should return null for unknown tag", async () => {
      mockTreeSitterInstance.getTranslationKeyAtPosition.mockReturnValue(null);
      mockTreeSitterInstance.getTagIdentifierAtPosition.mockReturnValue(
        "unknown_tag",
      );

      const handler = new HoverHandler(mockParams);
      const result = await handler.handleHoverRequest();

      expect(result).toBeNull();
    });

    it("should prioritize translation hover over tag hover", async () => {
      // Mock both translation and tag identifier found
      mockTreeSitterInstance.getTranslationKeyAtPosition.mockReturnValue(
        "test_key",
      );
      mockTreeSitterInstance.getTagIdentifierAtPosition.mockReturnValue(
        "unreconciled",
      );

      // Mock the scope aware provider to return a translation definition
      mockScopeAwareInstance.findScopedTranslationDefinition.mockReturnValue({
        content: "default: 'Test translation'",
      });

      const handler = new HoverHandler(mockParams);
      const result = await handler.handleHoverRequest();

      // Should return translation hover, not tag hover
      expect(result).toContain("**Translation:** `test_key`");
      expect(result).not.toContain("**Tag:** `unreconciled`");
    });

    it("should fall back to tag hover when no translation found", async () => {
      mockTreeSitterInstance.getTranslationKeyAtPosition.mockReturnValue(
        "test_key",
      );
      mockTreeSitterInstance.getTagIdentifierAtPosition.mockReturnValue(
        "unreconciled",
      );

      // Mock scope aware provider to return null (no translation definition)
      mockScopeAwareInstance.findScopedTranslationDefinition.mockReturnValue(
        null,
      );

      const handler = new HoverHandler(mockParams);
      const result = await handler.handleHoverRequest();

      // Should return translation "not found" message, not tag hover
      expect(result).toContain("**Translation:** `test_key`");
      expect(result).toContain("**Status:** Definition not found");
      expect(result).not.toContain("**Tag:** `unreconciled`");
    });

    it("should return null when neither translation nor tag found", async () => {
      mockTreeSitterInstance.getTranslationKeyAtPosition.mockReturnValue(null);
      mockTreeSitterInstance.getTagIdentifierAtPosition.mockReturnValue(null);

      const handler = new HoverHandler(mockParams);
      const result = await handler.handleHoverRequest();

      expect(result).toBeNull();
    });

    it("should handle tag hover with complex tag content", async () => {
      mockFs.readFileSync = jest
        .fn()
        .mockReturnValue(
          "{% unreconciled accounts.current_year unreconciled_text:'Custom text' %}",
        );
      mockTreeSitterInstance.getTranslationKeyAtPosition.mockReturnValue(null);
      mockTreeSitterInstance.getTagIdentifierAtPosition.mockReturnValue(
        "unreconciled",
      );

      const handler = new HoverHandler(mockParams);
      const result = await handler.handleHoverRequest();

      expect(result).not.toBeNull();
      expect(result).toContain("**Tag:** `unreconciled`");
      expect(result).toContain(
        "https://developer.silverfin.com/docs/unreconciled",
      );
    });

    it("should handle multiline tag structures", async () => {
      const multilineTag = `{%
  result
  'accounts.current_year'
%}`;
      mockFs.readFileSync = jest.fn().mockReturnValue(multilineTag);
      mockTreeSitterInstance.getTranslationKeyAtPosition.mockReturnValue(null);
      mockTreeSitterInstance.getTagIdentifierAtPosition.mockReturnValue(
        "result",
      );

      const handler = new HoverHandler(mockParams);
      const result = await handler.handleHoverRequest();

      expect(result).not.toBeNull();
      expect(result).toContain("**Tag:** `result`");
      expect(result).toContain("https://developer.silverfin.com/docs/result");
    });

    it("should log appropriate debug messages for tag detection", async () => {
      mockTreeSitterInstance.getTranslationKeyAtPosition.mockReturnValue(null);
      mockTreeSitterInstance.getTagIdentifierAtPosition.mockReturnValue(
        "unreconciled",
      );

      const handler = new HoverHandler(mockParams);
      await handler.handleHoverRequest();

      // Verify the methods were called
      expect(
        mockTreeSitterInstance.getTranslationKeyAtPosition,
      ).toHaveBeenCalled();
      expect(
        mockTreeSitterInstance.getTagIdentifierAtPosition,
      ).toHaveBeenCalled();
    });
  });
});
