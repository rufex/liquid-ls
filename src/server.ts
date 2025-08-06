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
import { Logger } from "./logger";
import { HoverHandler } from "./hoverHandler";
import { DefinitionHandler } from "./definitionHandler";

export class LiquidLanguageServer {
  private connection: Connection;
  private documents: TextDocuments<TextDocument> = new TextDocuments(
    TextDocument,
  );
  private logger: Logger;

  constructor(connection?: Connection) {
    this.connection = connection || createConnection(ProposedFeatures.all);
    this.logger = new Logger("LiquidLanguageServer");
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.connection.onInitialize((_params: InitializeParams) => {
      // Currently nothing done with Client initial params
      // const capabilities = params.capabilities;

      const result: InitializeResult = {
        // Each capability defined needs a handler method e.g onHover
        capabilities: {
          textDocumentSync: TextDocumentSyncKind.Incremental,
          hoverProvider: true,
          definitionProvider: true,
        },
      };
      return result;
    });

    this.connection.onInitialized(() => {
      this.logger.info("Server initialized");
    });

    this.connection.onDidChangeWatchedFiles((_change) => {
      this.logger.logRequest("didChangeWatchedFiles");
      this.connection.console.log("File change event received");
    });

    this.documents.onDidChangeContent((change) => {
      this.logger.logRequest("didChangeContent");
      this.connection.console.log(`didChangeContent: ${change.document.uri}`);
    });

    this.connection.onHover(async (params): Promise<Hover | null> => {
      this.logger.logRequest("onHover", params);
      this.connection.console.log(
        `Hover request for: ${params.textDocument.uri}`,
      );

      const hoverHandler = new HoverHandler(params);
      const response = await hoverHandler.handleHoverRequest();
      if (response) {
        return {
          contents: response,
        };
      }
      return null;
    });

    this.connection.onDefinition(async (params): Promise<Definition | null> => {
      this.logger.logRequest("onDefinition", params);
      this.connection.console.log(
        `Definition request for: ${params.textDocument.uri}`,
      );

      const definitionHandler = new DefinitionHandler(params);
      const response = await definitionHandler.handleDefinitionRequest();
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
