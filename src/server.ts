import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  TextDocumentSyncKind,
  InitializeResult,
  Connection,
  Hover,
  Definition,
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";
import { Logger } from "./logger";
import { HoverProvider } from "./lspCapabilities/hoverProvider";
import { DefinitionProvider } from "./lspCapabilities/definitionProvider";

export class LiquidLanguageServer {
  private connection: Connection;
  private documents: TextDocuments<TextDocument> = new TextDocuments(
    TextDocument,
  );
  private logger: Logger;
  private workspaceRoot: string | null = null;

  constructor(connection?: Connection) {
    this.connection = connection || createConnection(ProposedFeatures.all);
    this.logger = new Logger("LiquidLanguageServer");
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.connection.onInitialize((params: InitializeParams) => {
      if (params.rootUri) {
        this.workspaceRoot = URI.parse(params.rootUri).fsPath;
        this.logger.info(`Workspace root: ${this.workspaceRoot}`);
      } else if (params.rootPath) {
        this.workspaceRoot = params.rootPath;
        this.logger.info(`Workspace root (legacy): ${this.workspaceRoot}`);
      }

      const result: InitializeResult = {
        capabilities: {
          textDocumentSync: TextDocumentSyncKind.Full,
          hoverProvider: true,
          definitionProvider: true,
        },
      };
      return result;
    });

    this.connection.onInitialized(() => {
      this.logger.info("Server initialized");
    });

    // this.connection.onDidChangeWatchedFiles((_change) => {
    //   this.logger.logRequest("didChangeWatchedFiles");
    //   this.connection.console.log("File change event received");
    // });
    //
    // this.documents.onDidChangeContent((change) => {
    //   this.logger.logRequest("didChangeContent");
    //   this.connection.console.log(`didChangeContent: ${change.document.uri}`);
    // });

    this.connection.onHover(async (params): Promise<Hover | null> => {
      this.logger.logRequest("onHover", params);
      this.connection.console.log(
        `Hover request for: ${params.textDocument.uri}`,
      );

      const hoverProvider = new HoverProvider(params, this.workspaceRoot);
      const response = await hoverProvider.handleHoverRequest();
      if (response) {
        return {
          contents: response,
        };
      }
      return null;
    });

    this.connection.onDefinition(async (params): Promise<Definition | null> => {
      this.connection.console.log(
        `Definition request for: ${params.textDocument.uri}`,
      );

      const definitionProvider = new DefinitionProvider(
        params,
        this.workspaceRoot,
      );
      const response = await definitionProvider.handleDefinitionRequest();
      return response;
    });

    this.documents.listen(this.connection);
  }

  public start(): void {
    this.connection.listen();
  }

  public stop(): void {
    this.connection.dispose();
  }
}
