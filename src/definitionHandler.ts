import { TreeSitterLiquidProvider } from "./treeSitterLiquidProvider";
import { ScopeAwareProvider } from "./scopeAwareProvider";
import { RelatedFilesProvider } from "./relatedFilesProvider";
import { Logger } from "./logger";
import { DefinitionParams, Location, Range } from "vscode-languageserver/node";
import { URI } from "vscode-uri";
import * as fs from "fs";
import * as path from "path";
import * as Parser from "tree-sitter";

export class DefinitionHandler {
  private textDocumentUri: DefinitionParams["textDocument"]["uri"];
  private position: DefinitionParams["position"];
  private logger: Logger;
  private provider: TreeSitterLiquidProvider;
  private scopeAwareProvider: ScopeAwareProvider;
  private relatedFilesProvider: RelatedFilesProvider;

  constructor(params: DefinitionParams, workspaceRoot?: string | null) {
    this.textDocumentUri = params.textDocument.uri;
    this.position = params.position;
    this.logger = new Logger("DefinitionHandler");
    this.provider = new TreeSitterLiquidProvider();
    this.scopeAwareProvider = new ScopeAwareProvider(
      workspaceRoot || undefined,
    );
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

    // First, check if this is an include statement
    const includePath = this.provider.getIncludePathAtPosition(
      parsedTree,
      this.position.line,
      this.position.character,
    );

    if (includePath) {
      this.logger.debug(`Found include path: ${includePath}`);
      return this.handleIncludeDefinition(includePath, filePath);
    }

    // Then, check if this is a variable reference
    const variableName = this.provider.getVariableAtPosition(
      parsedTree,
      this.position.line,
      this.position.character,
    );

    if (variableName) {
      this.logger.debug(`Found variable reference: ${variableName}`);
      return this.handleVariableDefinition(variableName);
    }

    // Finally, check if this is a translation call
    const translationKey = this.provider.getTranslationKeyAtPosition(
      parsedTree,
      this.position.line,
      this.position.character,
    );

    if (!translationKey) {
      this.logger.debug(
        "Position is not on a translation call, variable reference, or include statement",
      );
      return null;
    }

    this.logger.debug(`Found translation key: ${translationKey}`);

    // Search for translation definition using scope-aware lookup
    const definitionResult =
      this.scopeAwareProvider.findScopedTranslationDefinition(
        this.textDocumentUri,
        translationKey,
        this.position.line,
      );

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

  private handleVariableDefinition(variableName: string): Location[] | null {
    this.logger.debug(`Searching for variable definition: ${variableName}`);

    // Search for variable definition using scope-aware lookup
    const definitionResult =
      this.scopeAwareProvider.findScopedVariableDefinition(
        this.textDocumentUri,
        variableName,
        this.position.line,
      );

    if (!definitionResult) {
      this.logger.debug(`No definition found for variable: ${variableName}`);
      return null;
    }

    // Get the precise location of the variable name within the definition
    const variableNameNode = this.provider.getVariableNameLocation(
      definitionResult.definition,
    );
    const targetNode = variableNameNode || definitionResult.definition;

    // Calculate the location of the definition
    const location = this.getDefinitionLocation(
      targetNode,
      definitionResult.filePath,
    );

    if (location) {
      this.logger.debug(
        `Found variable definition location: ${JSON.stringify(location)}`,
      );
      return [location];
    }

    return null;
  }

  private handleIncludeDefinition(
    includePath: string,
    currentFilePath: string,
  ): Location[] | null {
    // Find the main template file to get the correct template directory
    const mainTemplateFile = this.relatedFilesProvider.getMainTemplateFile(
      `file://${currentFilePath}`,
    );

    if (!mainTemplateFile) {
      this.logger.debug(
        `Could not find main template file for: ${currentFilePath}`,
      );
      return null;
    }

    // Use the directory of the main template file as the template directory
    const templateDir = path.dirname(mainTemplateFile);
    const resolvedPath = this.scopeAwareProvider.resolveIncludePath(
      includePath,
      templateDir,
    );

    if (!resolvedPath) {
      this.logger.debug(
        `Could not resolve include path: ${includePath} from template dir: ${templateDir}`,
      );
      return null;
    }

    this.logger.debug(
      `Resolved include path: ${includePath} -> ${resolvedPath}`,
    );

    // Create location pointing to the first line of the included file
    const location: Location = {
      uri: `file://${resolvedPath}`,
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 },
      },
    };

    return [location];
  }
}
