import { TemplatePartsCollectionManager } from "../src/templates/templatePartsCollectionManager";
import { TemplatePartsMapper } from "../src/templates/templatePartsMapper";
import { TemplateParts } from "../src/types";

// Mock the TemplatePartsMapper
jest.mock("../src/templates/templatePartsMapper");

describe("TemplatePartsCollectionManager", () => {
  const mockWorkspaceRoot = "/mock/workspace";
  let mockTemplatePartsMapper: jest.Mocked<TemplatePartsMapper>;

  beforeEach(() => {
    // Reset singleton instance before each test
    (
      TemplatePartsCollectionManager as unknown as {
        instance: TemplatePartsCollectionManager | null;
      }
    ).instance = null;

    // Create mock instance
    mockTemplatePartsMapper = {
      generateTemplateMap: jest.fn(),
    } as unknown as jest.Mocked<TemplatePartsMapper>;

    // Mock the constructor to return our mock instance
    (
      TemplatePartsMapper as jest.MockedClass<typeof TemplatePartsMapper>
    ).mockImplementation(() => mockTemplatePartsMapper);
  });

  afterEach(() => {
    (
      TemplatePartsCollectionManager as unknown as {
        instance: TemplatePartsCollectionManager | null;
      }
    ).instance = null;
    jest.clearAllMocks();
  });

  describe("Singleton Pattern", () => {
    it("should create a single instance", () => {
      const instance1 =
        TemplatePartsCollectionManager.getInstance(mockWorkspaceRoot);
      const instance2 = TemplatePartsCollectionManager.getInstance();

      expect(instance1).toBe(instance2);
      expect(TemplatePartsMapper).toHaveBeenCalledWith(mockWorkspaceRoot);
      expect(TemplatePartsMapper).toHaveBeenCalledTimes(1);
    });

    it("should require workspaceRoot on first instantiation", () => {
      expect(() => TemplatePartsCollectionManager.getInstance()).toThrow(
        "workspaceRoot is required when creating the first instance",
      );
    });

    it("should allow getting instance without workspaceRoot after first creation", () => {
      const instance1 =
        TemplatePartsCollectionManager.getInstance(mockWorkspaceRoot);
      const instance2 = TemplatePartsCollectionManager.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe("loadMap", () => {
    let manager: TemplatePartsCollectionManager;

    beforeEach(() => {
      manager = TemplatePartsCollectionManager.getInstance(mockWorkspaceRoot);
    });

    it("should load a template successfully", async () => {
      const mockTemplateParts: TemplateParts = [
        { type: "main", name: "main", startLine: 0, endLine: 10 },
        { type: "textPart", name: "greeting", startLine: 0, endLine: 5 },
      ];

      mockTemplatePartsMapper.generateTemplateMap.mockReturnValue(
        mockTemplateParts,
      );

      const result = await manager.loadMap(
        "reconciliationText",
        "test_template",
      );

      expect(result).toBe(mockTemplateParts);
      expect(mockTemplatePartsMapper.generateTemplateMap).toHaveBeenCalledWith(
        "reconciliationText",
        "test_template",
      );
    });

    it("should handle loading failure", async () => {
      mockTemplatePartsMapper.generateTemplateMap.mockReturnValue(null);

      const result = await manager.loadMap(
        "accountTemplate",
        "invalid_template",
      );

      expect(result).toBeNull();
    });

    it("should handle loading error", async () => {
      mockTemplatePartsMapper.generateTemplateMap.mockImplementation(() => {
        throw new Error("Parse error");
      });

      const result = await manager.loadMap("exportFile", "error_template");

      expect(result).toBeNull();
    });

    it("should refresh existing template", async () => {
      const originalParts: TemplateParts = [
        { type: "main", name: "main", startLine: 0, endLine: 5 },
      ];
      const updatedParts: TemplateParts = [
        { type: "main", name: "main", startLine: 0, endLine: 10 },
        { type: "textPart", name: "new_part", startLine: 0, endLine: 3 },
      ];

      // First load
      mockTemplatePartsMapper.generateTemplateMap.mockReturnValue(
        originalParts,
      );
      await manager.loadMap("reconciliationText", "refresh_template");

      // Refresh with updated content
      mockTemplatePartsMapper.generateTemplateMap.mockReturnValue(updatedParts);
      const result = await manager.loadMap(
        "reconciliationText",
        "refresh_template",
      );

      expect(result).toBe(updatedParts);
    });

    it("should remove template from cache if loading fails after being cached", async () => {
      const originalParts: TemplateParts = [
        { type: "main", name: "main", startLine: 0, endLine: 5 },
      ];

      // First load succeeds
      mockTemplatePartsMapper.generateTemplateMap.mockReturnValue(
        originalParts,
      );
      await manager.loadMap("reconciliationText", "fail_refresh");

      // Verify it's cached by getting it
      const cachedResult = await manager.getMap(
        "reconciliationText",
        "fail_refresh",
      );
      expect(cachedResult).toBe(originalParts);
      expect(mockTemplatePartsMapper.generateTemplateMap).toHaveBeenCalledTimes(
        1,
      );

      // Refresh fails
      mockTemplatePartsMapper.generateTemplateMap.mockReturnValue(null);
      const result = await manager.loadMap(
        "reconciliationText",
        "fail_refresh",
      );

      expect(result).toBeNull();

      // Should no longer be cached - next getMap should try to load again
      mockTemplatePartsMapper.generateTemplateMap.mockClear();
      await manager.getMap("reconciliationText", "fail_refresh");
      expect(mockTemplatePartsMapper.generateTemplateMap).toHaveBeenCalledTimes(
        1,
      );
    });
  });

  describe("getMap", () => {
    let manager: TemplatePartsCollectionManager;

    beforeEach(() => {
      manager = TemplatePartsCollectionManager.getInstance(mockWorkspaceRoot);
    });

    it("should return cached template if available", async () => {
      const mockTemplateParts: TemplateParts = [
        { type: "main", name: "main", startLine: 0, endLine: 10 },
      ];

      mockTemplatePartsMapper.generateTemplateMap.mockReturnValue(
        mockTemplateParts,
      );

      // Load template first
      await manager.loadMap("sharedPart", "cached_template");

      // Get should return cached version without calling mapper again
      mockTemplatePartsMapper.generateTemplateMap.mockClear();
      const result = await manager.getMap("sharedPart", "cached_template");

      expect(result).toBe(mockTemplateParts);
      expect(
        mockTemplatePartsMapper.generateTemplateMap,
      ).not.toHaveBeenCalled();
    });

    it("should load template if not cached", async () => {
      const mockTemplateParts: TemplateParts = [
        { type: "textPart", name: "auto_loaded", startLine: 0, endLine: 5 },
      ];

      mockTemplatePartsMapper.generateTemplateMap.mockReturnValue(
        mockTemplateParts,
      );

      const result = await manager.getMap(
        "accountTemplate",
        "auto_load_template",
      );

      expect(result).toBe(mockTemplateParts);
      expect(mockTemplatePartsMapper.generateTemplateMap).toHaveBeenCalledWith(
        "accountTemplate",
        "auto_load_template",
      );
    });

    it("should return null if auto-loading fails", async () => {
      mockTemplatePartsMapper.generateTemplateMap.mockReturnValue(null);

      const result = await manager.getMap("exportFile", "invalid_template");

      expect(result).toBeNull();
    });
  });

  describe("Template Key Generation", () => {
    let manager: TemplatePartsCollectionManager;

    beforeEach(() => {
      manager = TemplatePartsCollectionManager.getInstance(mockWorkspaceRoot);
    });

    it("should handle different template types correctly", async () => {
      const mockParts: TemplateParts = [
        { type: "main", name: "main", startLine: 0, endLine: 5 },
      ];

      mockTemplatePartsMapper.generateTemplateMap.mockReturnValue(mockParts);

      // Load different template types with same name
      await manager.loadMap("reconciliationText", "test");
      await manager.loadMap("accountTemplate", "test");
      await manager.loadMap("exportFile", "test");
      await manager.loadMap("sharedPart", "test");

      // All should be cached independently
      const rt = await manager.getMap("reconciliationText", "test");
      const at = await manager.getMap("accountTemplate", "test");
      const ef = await manager.getMap("exportFile", "test");
      const sp = await manager.getMap("sharedPart", "test");

      // Should only have called generateTemplateMap 4 times (during load)
      expect(mockTemplatePartsMapper.generateTemplateMap).toHaveBeenCalledTimes(
        4,
      );

      expect(rt).toBe(mockParts);
      expect(at).toBe(mockParts);
      expect(ef).toBe(mockParts);
      expect(sp).toBe(mockParts);
    });

    it("should handle special characters in template names", async () => {
      const mockParts: TemplateParts = [
        { type: "main", name: "main", startLine: 0, endLine: 5 },
      ];

      mockTemplatePartsMapper.generateTemplateMap.mockReturnValue(mockParts);

      const templateName = "template-with-dashes_and_underscores";

      await manager.loadMap("reconciliationText", templateName);

      // Should be able to retrieve it
      const result = await manager.getMap("reconciliationText", templateName);
      expect(result).toBe(mockParts);

      // Should only have called generateTemplateMap once (during load)
      expect(mockTemplatePartsMapper.generateTemplateMap).toHaveBeenCalledTimes(
        1,
      );
    });

    it("should differentiate between same template name but different types", async () => {
      const rtParts: TemplateParts = [
        { type: "main", name: "main", startLine: 0, endLine: 10 },
      ];
      const atParts: TemplateParts = [
        { type: "textPart", name: "part1", startLine: 0, endLine: 5 },
      ];

      mockTemplatePartsMapper.generateTemplateMap
        .mockReturnValueOnce(rtParts)
        .mockReturnValueOnce(atParts);

      await manager.loadMap("reconciliationText", "samename");
      await manager.loadMap("accountTemplate", "samename");

      const rtResult = await manager.getMap("reconciliationText", "samename");
      const atResult = await manager.getMap("accountTemplate", "samename");

      expect(rtResult).toBe(rtParts);
      expect(atResult).toBe(atParts);
      expect(rtResult).not.toBe(atResult);
    });
  });

  describe("Error Handling", () => {
    let manager: TemplatePartsCollectionManager;

    beforeEach(() => {
      manager = TemplatePartsCollectionManager.getInstance(mockWorkspaceRoot);
    });

    it("should handle exceptions in generateTemplateMap during loadMap", async () => {
      mockTemplatePartsMapper.generateTemplateMap.mockImplementation(() => {
        throw new Error("File system error");
      });

      const result = await manager.loadMap(
        "reconciliationText",
        "error_template",
      );

      expect(result).toBeNull();
    });

    it("should handle exceptions in generateTemplateMap during getMap", async () => {
      mockTemplatePartsMapper.generateTemplateMap.mockImplementation(() => {
        throw new Error("Parse error");
      });

      const result = await manager.getMap("accountTemplate", "error_template");

      expect(result).toBeNull();
    });

    it("should recover from errors - successful load after failed load", async () => {
      const mockParts: TemplateParts = [
        { type: "main", name: "main", startLine: 0, endLine: 10 },
      ];

      // First call fails
      mockTemplatePartsMapper.generateTemplateMap
        .mockImplementationOnce(() => {
          throw new Error("Temporary error");
        })
        .mockReturnValueOnce(mockParts);

      // First attempt fails
      const failResult = await manager.loadMap(
        "reconciliationText",
        "recovery_test",
      );
      expect(failResult).toBeNull();

      // Second attempt succeeds
      const successResult = await manager.loadMap(
        "reconciliationText",
        "recovery_test",
      );
      expect(successResult).toBe(mockParts);

      // Should be cached now
      const cachedResult = await manager.getMap(
        "reconciliationText",
        "recovery_test",
      );
      expect(cachedResult).toBe(mockParts);
    });
  });
});
