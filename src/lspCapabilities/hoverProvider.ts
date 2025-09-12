import { TreeSitterLiquidProvider } from "../liquid/treeSitterLiquidProvider";
import { ScopeAwareProvider } from "../scopeAwareProvider";
import { DocumentationProvider } from "./documentationProvider";
import { Logger } from "../logger";
import { HoverParams } from "vscode-languageserver/node";
import { URI } from "vscode-uri";
import * as fs from "fs";

export class HoverProvider {
  private textDocumentUri: HoverParams["textDocument"]["uri"];
  private position: HoverParams["position"];
  private logger: Logger;
  private parser: TreeSitterLiquidProvider;
  private scopeAwareProvider: ScopeAwareProvider;
  private documentationProvider: DocumentationProvider;

  constructor(params: HoverParams, workspaceRoot?: string | null) {
    this.textDocumentUri = params.textDocument.uri;
    this.position = params.position;
    this.logger = new Logger("HoverProvider");
    this.parser = new TreeSitterLiquidProvider();
    this.scopeAwareProvider = new ScopeAwareProvider(
      workspaceRoot || undefined,
    );
    this.documentationProvider = new DocumentationProvider();

    this.logger.logRequest("HoverProvider initialized", {
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

    const parsedTree = this.parser.parseText(document);

    if (!parsedTree) {
      this.logger.error("Failed to parse document with Tree-sitter");
      return null;
    }

    this.logger.debug(
      `Parsed tree structure: ${parsedTree.rootNode.toString()}`,
    );

    // Check if this is a translation call

    this.logger.debug(
      `Checking for translation at position ${this.position.line}:${this.position.character}`,
    );

    const translationKey = this.parser.getTranslationKeyAtPosition(
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

    // Check if this is a tag identifier for documentation

    this.logger.debug(
      `Checking for tag documentation at position ${this.position.line}:${this.position.character}`,
    );
    const tagIdentifier = this.parser.getTagIdentifierAtPosition(
      parsedTree,
      this.position.line,
      this.position.character,
    );

    this.logger.debug(
      `Tag identifier result: ${tagIdentifier ? `"${tagIdentifier}"` : "null"}`,
    );

    if (tagIdentifier) {
      this.logger.debug(`Found tag identifier: ${tagIdentifier}`);

      const tagHoverContent =
        this.documentationProvider.getTagHoverContent(tagIdentifier);
      if (tagHoverContent) {
        this.logger.debug(`Found tag documentation for: ${tagIdentifier}`);
        return tagHoverContent;
      } else {
        this.logger.debug(`No documentation found for tag: ${tagIdentifier}`);
      }
    }

    // No hover information available
    return null;
  }
}
