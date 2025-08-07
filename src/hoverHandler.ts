import { TreeSitterLiquidProvider } from "./treeSitterLiquidProvider";
import { ScopeAwareProvider } from "./scopeAwareProvider";
import { Logger } from "./logger";
import { HoverParams } from "vscode-languageserver/node";
import { URI } from "vscode-uri";
import * as fs from "fs";

export class HoverHandler {
  private textDocumentUri: HoverParams["textDocument"]["uri"];
  private position: HoverParams["position"];
  private logger: Logger;
  private provider: TreeSitterLiquidProvider;
  private scopeAwareProvider: ScopeAwareProvider;

  constructor(params: HoverParams) {
    this.textDocumentUri = params.textDocument.uri;
    this.position = params.position;
    this.logger = new Logger("HoverHandler");
    this.provider = new TreeSitterLiquidProvider();
    this.scopeAwareProvider = new ScopeAwareProvider();

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

    this.logger.debug(
      `Parsed tree structure: ${parsedTree.rootNode.toString()}`,
    );

    const node = parsedTree.rootNode.descendantForPosition({
      row: this.position.line,
      column: this.position.character,
    });

    this.logger.debug(`Text: ${node.text} Type: ${node.type}`);

    // Check if this is a translation call
    this.logger.debug(
      `Checking for translation at position ${this.position.line}:${this.position.character}`,
    );
    const translationKey = this.provider.getTranslationKeyAtPosition(
      parsedTree,
      this.position.line,
      this.position.character,
    );

    this.logger.debug(
      `Translation key result: ${translationKey ? `"${translationKey}"` : "null"}`,
    );

    if (translationKey) {
      this.logger.debug(`Found translation key: ${translationKey}`);

      // Search for translation definition using scope-aware lookup
      const scopedDefinition =
        this.scopeAwareProvider.findScopedTranslationDefinition(
          this.textDocumentUri,
          translationKey,
          this.position.line,
        );

      if (scopedDefinition) {
        this.logger.debug(
          `Found scoped translation definition: ${scopedDefinition.content}`,
        );
        return `**Translation:** \`${translationKey}\`\n\n**Locales:**\n${scopedDefinition.content}`;
      } else {
        return `**Translation:** \`${translationKey}\`\n\n**Status:** Definition not found`;
      }
    }

    // No hover information for non-translation content
    return null;
  }
}
