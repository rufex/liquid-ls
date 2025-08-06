import { TreeSitterLiquidProvider } from "./treeSitterLiquidProvider";
import { RelatedFilesProvider } from "./relatedFilesProvider";
import { Logger } from "./logger";
import { HoverParams } from "vscode-languageserver/node";
import { URI } from "vscode-uri";
import * as fs from "fs";

export class HoverHandler {
  private textDocumentUri: HoverParams["textDocument"]["uri"];
  private position: HoverParams["position"];
  private logger: Logger;
  private provider: TreeSitterLiquidProvider;
  private relatedFilesProvider: RelatedFilesProvider;

  constructor(params: HoverParams) {
    this.textDocumentUri = params.textDocument.uri;
    this.position = params.position;
    this.logger = new Logger("HoverHandler");
    this.provider = new TreeSitterLiquidProvider();
    this.relatedFilesProvider = new RelatedFilesProvider();

    this.logger.logRequest("HoverHandler initialized", {
      uri: this.textDocumentUri,
      position: this.position,
    });
  }

  public async handleHoverRequest(): Promise<string | null> {
    console.log("=== HOVER REQUEST RECEIVED ===");
    console.log("URI:", this.textDocumentUri);
    console.log("Position:", this.position);

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

      // Search for translation definition across all related files
      const definition = this.findTranslationInRelatedFiles(translationKey);

      if (definition) {
        this.logger.debug(
          `Found translation definition: ${definition.content}`,
        );
        return `**Translation:** \`${translationKey}\`\n\n**Locales:**\n${definition.content}`;
      } else {
        return `**Translation:** \`${translationKey}\`\n\n**Status:** Definition not found`;
      }
    }

    // Fallback to original behavior
    return `nodeText: ${node.text}, nodeType: ${node.type}`;
  }

  private findTranslationInRelatedFiles(
    translationKey: string,
  ): { content: string; filePath: string } | null {
    // First, find the main template file (in case we're starting from a text part)
    const mainTemplateFile = this.relatedFilesProvider.getMainTemplateFile(
      this.textDocumentUri,
    );
    if (!mainTemplateFile) {
      this.logger.error("Could not determine main template file");
      return null;
    }

    // Get all related files for this template using the main template file
    const mainTemplateUri = `file://${mainTemplateFile}`;
    const allFiles =
      this.relatedFilesProvider.getAllTemplateFiles(mainTemplateUri);

    this.logger.debug(
      `Searching for translation '${translationKey}' in ${allFiles.length} files: ${allFiles.join(", ")}`,
    );

    for (const filePath of allFiles) {
      try {
        if (!fs.existsSync(filePath)) {
          this.logger.warn(`File not found: ${filePath}`);
          continue;
        }

        const fileContent = fs.readFileSync(filePath, "utf8");
        this.logger.debug(`File content (${filePath}): "${fileContent}"`);

        const parsedTree = this.provider.parseText(fileContent);

        if (!parsedTree) {
          this.logger.warn(`Failed to parse file: ${filePath}`);
          continue;
        }

        this.logger.debug(`Successfully parsed file: ${filePath}`);

        const definition = this.provider.findTranslationDefinitionByKey(
          parsedTree,
          translationKey,
        );

        if (definition) {
          const content =
            this.provider.extractTranslationDefinitionContent(definition);
          this.logger.debug(`Found translation definition in: ${filePath}`);
          return { content, filePath };
        }
      } catch (error) {
        this.logger.error(`Error processing file ${filePath}: ${error}`);
      }
    }

    return null;
  }
}
