import { LiquidLanguageServer } from "../src/server";
import { createConnection } from "vscode-languageserver/node";

jest.mock("vscode-languageserver/node");

describe("LiquidLanguageServer", () => {
  let server: LiquidLanguageServer;
  let mockConnection: any;

  beforeEach(() => {
    mockConnection = {
      onInitialize: jest.fn(),
      onInitialized: jest.fn(),
      onDidChangeConfiguration: jest.fn(),
      onDidChangeWatchedFiles: jest.fn(),
      listen: jest.fn(),
      dispose: jest.fn(),
      console: {
        log: jest.fn(),
      },
      client: {
        register: jest.fn(),
      },
      workspace: {
        onDidChangeWorkspaceFolders: jest.fn(),
      },
    };

    (createConnection as jest.Mock).mockReturnValue(mockConnection);
    server = new LiquidLanguageServer(mockConnection);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("initialization", () => {
    it("should create a server instance", () => {
      expect(server).toBeDefined();
      expect(server).toBeInstanceOf(LiquidLanguageServer);
    });

    it("should setup connection handlers", () => {
      expect(mockConnection.onInitialize).toHaveBeenCalled();
      expect(mockConnection.onInitialized).toHaveBeenCalled();
      expect(mockConnection.onDidChangeConfiguration).toHaveBeenCalled();
      expect(mockConnection.onDidChangeWatchedFiles).toHaveBeenCalled();
    });
  });

  describe("initialization handshake", () => {
    it("should handle initialize request with basic capabilities", () => {
      const onInitializeCallback = mockConnection.onInitialize.mock.calls[0][0];
      const params = {
        capabilities: {
          workspace: {
            configuration: true,
            workspaceFolders: true,
          },
        },
      };

      const result = onInitializeCallback(params);

      expect(result).toEqual({
        capabilities: {
          textDocumentSync: 2, // TextDocumentSyncKind.Incremental
          workspace: {
            workspaceFolders: {
              supported: true,
            },
          },
        },
      });
    });

    it("should handle initialize request without workspace capabilities", () => {
      const onInitializeCallback = mockConnection.onInitialize.mock.calls[0][0];
      const params = {
        capabilities: {},
      };

      const result = onInitializeCallback(params);

      expect(result).toEqual({
        capabilities: {
          textDocumentSync: 2, // TextDocumentSyncKind.Incremental
        },
      });
    });

    it("should handle onInitialized callback", () => {
      const onInitializedCallback =
        mockConnection.onInitialized.mock.calls[0][0];

      expect(() => onInitializedCallback()).not.toThrow();
    });
  });

  describe("configuration handling", () => {
    it("should handle configuration changes", () => {
      const onDidChangeConfigurationCallback =
        mockConnection.onDidChangeConfiguration.mock.calls[0][0];

      onDidChangeConfigurationCallback({});

      expect(mockConnection.console.log).toHaveBeenCalledWith(
        "Configuration changed",
      );
    });

    it("should handle file change events", () => {
      const onDidChangeWatchedFilesCallback =
        mockConnection.onDidChangeWatchedFiles.mock.calls[0][0];

      onDidChangeWatchedFilesCallback({});

      expect(mockConnection.console.log).toHaveBeenCalledWith(
        "File change event received",
      );
    });
  });

  describe("server lifecycle", () => {
    it("should start the server", () => {
      server.start();
      expect(mockConnection.listen).toHaveBeenCalled();
    });

    it("should stop the server", () => {
      server.stop();
      expect(mockConnection.dispose).toHaveBeenCalled();
    });
  });
});
