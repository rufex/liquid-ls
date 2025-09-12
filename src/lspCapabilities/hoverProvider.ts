import { TreeSitterLiquidProvider } from "../liquid/treeSitterLiquidProvider";
import { DocumentationProvider } from "./documentationProvider";
import { Logger } from "../logger";
import { HoverParams } from "vscode-languageserver/node";
import { URI } from "vscode-uri";
import * as fs from "fs";
import { TranslationParser } from "../liquid/translationParser";
import { TemplatePartsCollectionManager } from "../templates/templatePartsCollectionManager";
import { parseTemplateUri } from "../utils/templateUriParser";
import { TemplateParts, TemplateUriInfo } from "../types";

export class HoverProvider {
  private textDocumentUri: HoverParams["textDocument"]["uri"];
  private position: HoverParams["position"];
  private logger: Logger;
  private parser: TreeSitterLiquidProvider;
  private documentationProvider: DocumentationProvider;
  private workspaceRoot: string | null;

  constructor(params: HoverParams, workspaceRoot?: string | null) {
    this.workspaceRoot = workspaceRoot || null;
    this.textDocumentUri = params.textDocument.uri;
    this.position = params.position;
    this.logger = new Logger("HoverProvider");
    this.parser = new TreeSitterLiquidProvider();
    this.documentationProvider = new DocumentationProvider();

    this.logger.logRequest("HoverProvider initialized", {
      uri: this.textDocumentUri,
      position: this.position,
    });
    this.logger.debug(`Workspace root: ${this.workspaceRoot}`);
  }

  public async handleHoverRequest(): Promise<string | null> {
    const filePath = URI.parse(this.textDocumentUri).fsPath;
    const document = fs.readFileSync(filePath, "utf8");

    if (!document) {
      this.logger.error(`Document not found for URI: ${this.textDocumentUri}`);
      return null;
    }

    // TRANSLATIONS

    const translationParser = new TranslationParser();
    const translationExpressionNode = translationParser.isTranslationExpression(
      document,
      this.position.line,
      this.position.character,
    );

    this.logger.debug(
      `Is translation expression: ${translationExpressionNode !== null}`,
    );

    if (translationExpressionNode) {
      this.logger.debug(`Found translation: ${translationExpressionNode}`);

      const translationHover = await this.findLastTranslationStatement(
        translationExpressionNode,
        filePath,
      );
      if (translationHover) {
        return translationHover;
      }
    }

    // DOCUMENTATION

    const parsedTree = this.parser.parseText(document);

    if (!parsedTree) {
      this.logger.error("Failed to parse document with Tree-sitter");
      return null;
    }

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

  private async findLastTranslationStatement(
    translationExpressionNode: any,
    currentFilePath: string,
  ): Promise<string | null> {
    this.logger.debug("Starting findLastTranslationStatement");

    if (!this.workspaceRoot) {
      this.logger.warn("No workspace root defined for translation search");
      return null;
    }

    // 1. Identify template from params
    this.logger.debug(`Parsing template URI: ${this.textDocumentUri}`);
    const templateUriInfo: TemplateUriInfo | null = parseTemplateUri(
      this.textDocumentUri,
    );
    if (!templateUriInfo) {
      this.logger.warn(`Could not parse template URI: ${this.textDocumentUri}`);
      return null;
    }
    this.logger.debug(`Template URI info: ${JSON.stringify(templateUriInfo)}`);

    // 2. Get template parts
    const templateManager = TemplatePartsCollectionManager.getInstance(
      this.workspaceRoot,
    );
    const templateParts = await templateManager.getMap(
      templateUriInfo.templateType,
      templateUriInfo.templateName,
    );

    if (!templateParts) {
      this.logger.warn(
        `No template parts found for URI: ${this.textDocumentUri}`,
      );
      return null;
    }
    this.logger.debug(`Found ${templateParts.length} template parts`);

    // 3. Find current file position in template parts map
    const currentPosition = this.findCurrentFilePosition(
      templateParts,
      currentFilePath,
    );
    if (currentPosition === -1) {
      this.logger.warn(
        `Current file not found in template parts: ${currentFilePath}`,
      );
      return null;
    }
    this.logger.debug(`Current position in template parts: ${currentPosition}`);

    // 4. Extract translation key from translation expression node
    const translationKey = this.extractTranslationKey(
      translationExpressionNode,
    );
    if (!translationKey) {
      this.logger.warn("Could not extract translation key from node");
      return null;
    }
    this.logger.debug(`Looking for translation key: ${translationKey}`);

    // 5. Query all files before current position for translation statements
    const lastTranslationNode = this.queryFilesForTranslations(
      templateParts,
      currentPosition,
      translationKey,
    );

    // 6. Return details of last found translation statement
    if (lastTranslationNode) {
      this.logger.debug("Found translation statement, extracting info");
      const translationParser = new TranslationParser();
      return translationParser.extractInfo(lastTranslationNode);
    }

    this.logger.debug("No translation statement found");
    return null;
  }

  private findCurrentFilePosition(
    templateParts: TemplateParts,
    currentFilePath: string,
  ): number {
    let lastMatchingIndex = -1;

    for (let i = 0; i < templateParts.length; i++) {
      if (templateParts[i].fileFullPath === currentFilePath) {
        // Check if current position is within this part's line range
        if (
          this.position.line >= templateParts[i].startLine &&
          this.position.line <= templateParts[i].endLine
        ) {
          return i;
        }
        lastMatchingIndex = i;
      }
    }

    // If we found matching files but current position wasn't within any range,
    // return the last matching file index
    return lastMatchingIndex;
  }

  private extractTranslationKey(translationExpressionNode: any): string | null {
    const translationParser = new TranslationParser();

    // Use the TranslationParser's extractTranslationKey method
    if (translationExpressionNode.childForFieldName) {
      const keyNode = translationExpressionNode.childForFieldName("key");
      if (keyNode && keyNode.type === "string") {
        const extractedKey =
          translationParser["extractTranslationKey"](keyNode);
        this.logger.debug(`Extracted translation key: ${extractedKey}`);
        return extractedKey;
      }
    }

    this.logger.warn(
      `Could not extract translation key from node: ${translationExpressionNode.type}`,
    );
    return null;
  }

  private queryFilesForTranslations(
    templateParts: TemplateParts,
    currentPosition: number,
    translationKey: string,
  ): any | null {
    let lastFoundTranslation: any = null;

    // Query all parts before (and including up to) the current position
    for (let i = 0; i <= currentPosition; i++) {
      const part = templateParts[i];

      try {
        const fileContent = fs.readFileSync(part.fileFullPath, "utf8");
        const translationStatements = this.findTranslationStatements(
          fileContent,
          translationKey,
        );

        // For the current file part, only consider translations before current position
        if (
          i === currentPosition &&
          part.fileFullPath === URI.parse(this.textDocumentUri).fsPath
        ) {
          for (const node of translationStatements) {
            if (node.startPosition.row < this.position.line) {
              lastFoundTranslation = node;
            }
          }
        } else {
          // For all other parts, take the last translation found
          if (translationStatements.length > 0) {
            lastFoundTranslation =
              translationStatements[translationStatements.length - 1];
          }
        }
      } catch (error) {
        this.logger.warn(`Could not read file: ${part.fileFullPath}, ${error}`);
      }
    }

    return lastFoundTranslation;
  }

  private findTranslationStatements(
    text: string,
    translationKey: string,
  ): any[] {
    const translationParser = new TranslationParser();
    const tree = translationParser["parser"].parse(text);
    if (!tree) {
      return [];
    }

    const matchingNodes: any[] = [];

    const queryString = `
      (translation_statement
        key: (string) @translation_key
      )
    `;

    try {
      const query = new (translationParser["parser"].constructor as any).Query(
        translationParser["language"],
        queryString,
      );
      const matches = query.matches(tree.rootNode);

      for (const match of matches) {
        for (const capture of match.captures) {
          if (capture.name === "translation_key") {
            const captureKey = translationParser["extractTranslationKey"](
              capture.node,
            );
            if (captureKey === translationKey) {
              let parent = capture.node.parent;
              while (parent && parent.type !== "translation_statement") {
                parent = parent.parent;
              }
              if (parent) {
                matchingNodes.push(parent);
              }
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error querying for translation statements: ${error}`);
    }

    return matchingNodes;
  }
}
