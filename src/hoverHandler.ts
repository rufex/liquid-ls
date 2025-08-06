import { TreeSitterLiquidProvider } from "./treeSitterLiquidProvider";
import { Logger } from "./logger";
import { HoverParams } from "vscode-languageserver/node";
import { URI } from "vscode-uri";
import * as fs from "fs";

export class HoverHandler {
  private textDocumentUri: HoverParams["textDocument"]["uri"];
  private position: HoverParams["position"];
  private logger: Logger;
  private provider: TreeSitterLiquidProvider;

  constructor(params: HoverParams) {
    this.textDocumentUri = params.textDocument.uri;
    this.position = params.position;
    this.logger = new Logger("HoverHandler");
    this.provider = new TreeSitterLiquidProvider();

    this.logger.logRequest("HoverHandler initialized", {
      uri: this.textDocumentUri,
      position: this.position,
    });
  }

  public async handleHoverRequest(): Promise<string | null> {
    this.logger.logRequest("handleHoverRequest", {
      uri: this.textDocumentUri,
      position: this.position,
    });

    // open document from file system or workspace
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

    const node = parsedTree.rootNode.descendantForPosition({
      row: this.position.line,
      column: this.position.character,
    });

    this.logger.debug(`Text: ${node.text} Type: ${node.type}`);

    // Check if this is a translation call
    const translationKey = this.provider.getTranslationKeyAtPosition(
      parsedTree,
      this.position.line,
      this.position.character,
    );

    if (translationKey) {
      this.logger.debug(`Found translation key: ${translationKey}`);

      // Find the corresponding translation definition
      const definition = this.provider.findTranslationDefinitionByKey(
        parsedTree,
        translationKey,
      );

      if (definition) {
        const content =
          this.provider.extractTranslationDefinitionContent(definition);
        this.logger.debug(`Found translation definition: ${content}`);
        return `**Translation:** \`${translationKey}\`\n\n**Locales:**\n${content}`;
      } else {
        return `**Translation:** \`${translationKey}\`\n\n**Status:** Definition not found`;
      }
    }

    // Fallback to original behavior
    return `nodeText: ${node.text}, nodeType: ${node.type}`;
  }
}
