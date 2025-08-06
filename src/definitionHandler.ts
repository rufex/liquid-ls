import { TreeSitterLiquidProvider } from "./treeSitterLiquidProvider";
import { RelatedFilesProvider } from "./relatedFilesProvider";
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
  private relatedFilesProvider: RelatedFilesProvider;

  constructor(params: DefinitionParams) {
    this.textDocumentUri = params.textDocument.uri;
    this.position = params.position;
    this.logger = new Logger("DefinitionHandler");
    this.provider = new TreeSitterLiquidProvider();
    this.relatedFilesProvider = new RelatedFilesProvider();

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

    // Search for translation definition across all related files
    const definitionResult = this.findTranslationInRelatedFiles(translationKey);

    if (!definitionResult) {
      this.logger.debug(
        `No definition found for translation key: ${translationKey}`,
      );
      return null;
    }

    // Calculate the location of the definition
    const location = this.getDefinitionLocation(
      definitionResult.definition,
      definitionResult.filePath,
    );

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
    filePath?: string,
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
        uri: filePath ? `file://${filePath}` : this.textDocumentUri,
        range: range,
      };

      return location;
    } catch (error) {
      this.logger.error(`Error calculating definition location: ${error}`);
      return null;
    }
  }

  private findTranslationInRelatedFiles(
    translationKey: string,
  ): { definition: Parser.SyntaxNode; filePath: string } | null {
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
      `Searching for translation '${translationKey}' in ${allFiles.length} files`,
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
          this.logger.debug(`Found translation definition in: ${filePath}`);
          return { definition, filePath };
        }
      } catch (error) {
        this.logger.error(`Error processing file ${filePath}: ${error}`);
      }
    }

    return null;
  }
}
