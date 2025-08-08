import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  TextDocumentSyncKind,
  InitializeResult,
  Connection,
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";
import { Logger } from "./logger";

export class LiquidLanguageServer {
  private connection: Connection;
  private documents: TextDocuments<TextDocument> = new TextDocuments(
    TextDocument,
  );
  private hasConfigurationCapability = false;
  private hasWorkspaceFolderCapability = false;
  private logger: Logger;

  constructor(connection?: Connection) {
    this.connection = connection || createConnection(ProposedFeatures.all);
    this.logger = new Logger("LiquidLanguageServer");
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.connection.onInitialize((params: InitializeParams) => {
      this.logger.logRequest("initialize", params);
      const capabilities = params.capabilities;

      // Does the client support the `workspace/configuration` request?
      this.hasConfigurationCapability = !!(
        capabilities.workspace && !!capabilities.workspace.configuration
      );
      this.hasWorkspaceFolderCapability = !!(
        capabilities.workspace && !!capabilities.workspace.workspaceFolders
      );

      const result: InitializeResult = {
        capabilities: {
          textDocumentSync: TextDocumentSyncKind.Incremental,
        },
      };
      if (this.hasWorkspaceFolderCapability) {
        result.capabilities.workspace = {
          workspaceFolders: {
            supported: true,
          },
        };
      }
      this.logger.logResponse("initialize", result);
      return result;
    });

    this.connection.onInitialized(() => {
      this.logger.info("Server initialized");
      if (this.hasConfigurationCapability) {
        // Register for all configuration changes.
        this.connection.client.register(
          DidChangeConfigurationNotification.type,
          undefined,
        );
      }
      if (this.hasWorkspaceFolderCapability) {
        this.connection.workspace.onDidChangeWorkspaceFolders((_event) => {
          this.logger.info("Workspace folder change event received");
          this.connection.console.log(
            "Workspace folder change event received.",
          );
        });
      }
    });

    this.connection.onDidChangeConfiguration((change) => {
      this.logger.logRequest("didChangeConfiguration", change);
      this.connection.console.log("Configuration changed");
    });

    this.connection.onDidChangeWatchedFiles((change) => {
      this.logger.logRequest("didChangeWatchedFiles", change);
      this.connection.console.log("File change event received");
    });

    // Make the text document manager listen on the connection
    // for open, change and close text document events
    this.documents.listen(this.connection);
  }

  public start(): void {
    this.connection.listen();
  }

  public stop(): void {
    this.connection.dispose();
  }
}
