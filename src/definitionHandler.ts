import { TreeSitterLiquidProvider } from "./treeSitterLiquidProvider";
import { Logger } from "./logger";
import { DefinitionParams, Location, Range } from "vscode-languageserver/node";
import { URI } from "vscode-uri";
import * as fs from "fs";
import * as Parser from "tree-sitter";

export class DefinitionHandler {
  private textDocumentUri: DefinitionParams["textDocument"]["uri"];
  private position: DefinitionParams["position"];
  private logger: Logger;
  private provider: TreeSitterLiquidProvider;

  constructor(params: DefinitionParams) {
    this.textDocumentUri = params.textDocument.uri;
    this.position = params.position;
    this.logger = new Logger("DefinitionHandler");
    this.provider = new TreeSitterLiquidProvider();

    this.logger.logRequest("DefinitionHandler initialized", {
      uri: this.textDocumentUri,
      position: this.position,
    });
  }

  public async handleDefinitionRequest(): Promise<Location[] | null> {
    this.logger.logRequest("handleDefinitionRequest", {
      uri: this.textDocumentUri,
      position: this.position,
    });

    // Open document from file system or workspace
    const filePath = URI.parse(this.textDocumentUri).fsPath;
    const document = fs.readFileSync(filePath, "utf8");

    if (!document) {
      this.logger.error(`Document not found for URI: ${this.textDocumentUri}`);
      return null;
    }

    const parsedTree = this.provider.parseText(document);

    if (!parsedTree) {
      this.logger.error("Failed to parse document with Tree-sitter");
      return null;
    }

    // Check if this is a translation call
    const translationKey = this.provider.getTranslationKeyAtPosition(
      parsedTree,
      this.position.line,
      this.position.character,
    );

    if (!translationKey) {
      this.logger.debug("Position is not on a translation call");
      return null;
    }

    this.logger.debug(`Found translation key: ${translationKey}`);

    // Find the corresponding translation definition
    const definition = this.provider.findTranslationDefinitionByKey(
      parsedTree,
      translationKey,
    );

    if (!definition) {
      this.logger.debug(
        `No definition found for translation key: ${translationKey}`,
      );
      return null;
    }

    // Calculate the location of the definition
    const location = this.getDefinitionLocation(definition);

    if (location) {
      this.logger.debug(
        `Found definition location: ${JSON.stringify(location)}`,
      );
      return [location];
    }

    return null;
  }

  private getDefinitionLocation(
    definitionNode: Parser.SyntaxNode,
  ): Location | null {
    try {
      // Try to get the precise location of the translation key
      const keyNode = this.provider.getTranslationKeyLocation(definitionNode);
      const targetNode = keyNode || definitionNode;

      // Get the start position of the target node
      const startPosition = targetNode.startPosition;
      const endPosition = targetNode.endPosition;

      // Convert TreeSitter positions to LSP positions
      const range: Range = {
        start: {
          line: startPosition.row,
          character: startPosition.column,
        },
        end: {
          line: endPosition.row,
          character: endPosition.column,
        },
      };

      const location: Location = {
        uri: this.textDocumentUri,
        range: range,
      };

      return location;
    } catch (error) {
      this.logger.error(`Error calculating definition location: ${error}`);
      return null;
    }
  }
}
