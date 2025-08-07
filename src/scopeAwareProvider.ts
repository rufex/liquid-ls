import { TreeSitterLiquidProvider } from "./treeSitterLiquidProvider";
import { Logger } from "./logger";
import { URI } from "vscode-uri";
import * as fs from "fs";
import * as path from "path";
import * as Parser from "tree-sitter";

export interface IncludeStatement {
  includePath: string;
  resolvedFilePath: string;
  lineNumber: number;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
}

export interface ScopeContext {
  currentFile: string;
  currentLine: number;
  availableIncludes: IncludeStatement[];
  scopedFiles: string[];
}

export interface TranslationDefinitionResult {
  definition: Parser.SyntaxNode;
  filePath: string;
  content: string;
}

export class ScopeAwareProvider {
  private logger: Logger;
  private treeProvider: TreeSitterLiquidProvider;

  constructor() {
    this.logger = new Logger("ScopeAwareProvider");
    this.treeProvider = new TreeSitterLiquidProvider();
  }

  /**
   * Find translation definition respecting Liquid execution scope
   * @param fileUri URI of the current file
   * @param translationKey The translation key to find
   * @param cursorLine The line number where the cursor is (0-based)
   * @returns Translation definition result or null
   */
  public findScopedTranslationDefinition(
    fileUri: string,
    translationKey: string,
    cursorLine: number,
  ): TranslationDefinitionResult | null {
    this.logger.debug(
      `Finding scoped translation '${translationKey}' at line ${cursorLine} in ${fileUri}`,
    );

    const filePath = URI.parse(fileUri).fsPath;
    const scopeContext = this.buildScopeContext(filePath, cursorLine);

    this.logger.debug(
      `Scope context: current file: ${scopeContext.currentFile}, line: ${scopeContext.currentLine}`,
    );
    this.logger.debug(
      `Available includes: ${scopeContext.availableIncludes.length}`,
    );
    this.logger.debug(`Scoped files: ${scopeContext.scopedFiles.join(", ")}`);

    // Search in execution order:
    // 1. Current file (up to cursor line)
    // 2. Included files (in inclusion order, all lines)

    // First, search current file up to cursor line
    const currentFileResult = this.searchInCurrentFileScope(
      scopeContext.currentFile,
      translationKey,
      scopeContext.currentLine,
    );

    if (currentFileResult) {
      this.logger.debug(
        `Found translation in current file: ${scopeContext.currentFile}`,
      );
      return currentFileResult;
    }

    // Then search included files in order
    for (const includeStmt of scopeContext.availableIncludes) {
      const includedFileResult = this.searchInIncludedFile(
        includeStmt.resolvedFilePath,
        translationKey,
      );

      if (includedFileResult) {
        this.logger.debug(
          `Found translation in included file: ${includeStmt.resolvedFilePath}`,
        );
        return includedFileResult;
      }
    }

    this.logger.debug(`No scoped translation found for '${translationKey}'`);
    return null;
  }

  /**
   * Build scope context for a given file and cursor position
   */
  private buildScopeContext(
    filePath: string,
    cursorLine: number,
  ): ScopeContext {
    // Build the complete execution chain including nested includes
    const allIncludes = this.buildExecutionChain(filePath, cursorLine);

    return {
      currentFile: filePath,
      currentLine: cursorLine,
      availableIncludes: allIncludes,
      scopedFiles: [
        filePath,
        ...allIncludes.map((inc) => inc.resolvedFilePath),
      ],
    };
  }

  /**
   * Build the complete execution chain including nested includes
   */
  private buildExecutionChain(
    filePath: string,
    cursorLine: number,
  ): IncludeStatement[] {
    const allIncludes: IncludeStatement[] = [];
    const processedFiles = new Set<string>(); // Prevent infinite loops

    const processFile = (currentFilePath: string) => {
      if (processedFiles.has(currentFilePath)) {
        this.logger.warn(`Circular include detected: ${currentFilePath}`);
        return;
      }
      processedFiles.add(currentFilePath);

      try {
        const fileContent = fs.readFileSync(currentFilePath, "utf8");
        const parsedTree = this.treeProvider.parseText(fileContent);

        if (!parsedTree) {
          this.logger.warn(`Failed to parse file: ${currentFilePath}`);
          return;
        }

        // Find includes in this file
        const includeStatements = this.findIncludeStatements(
          parsedTree,
          currentFilePath,
        );

        // Filter by line number if this is the original file
        const relevantIncludes =
          currentFilePath === filePath
            ? includeStatements.filter(
                (include) => include.lineNumber <= cursorLine,
              )
            : includeStatements; // Include all statements from included files

        // Add includes to the execution chain
        for (const include of relevantIncludes) {
          allIncludes.push(include);

          // Recursively process the included file
          processFile(include.resolvedFilePath);
        }
      } catch (error) {
        this.logger.error(`Error processing file ${currentFilePath}: ${error}`);
      }
    };

    // Start processing from the original file
    processFile(filePath);

    // Sort by the order they appear in the execution (breadth-first)
    return allIncludes;
  }

  /**
   * Find all include statements in a parsed tree
   */
  private findIncludeStatements(
    tree: Parser.Tree,
    currentFilePath: string,
  ): IncludeStatement[] {
    const includeStatements: IncludeStatement[] = [];
    // Always resolve includes relative to the main template directory, not the current file's directory
    const templateDir = this.getMainTemplateDirectory(currentFilePath);

    // Query for include statements
    const queryString = `
      (include_statement
        (string) @include_path
      )
    `;

    const matches = this.treeProvider.query(queryString, tree);

    for (const match of matches) {
      for (const capture of match.captures) {
        if (capture.name === "include_path") {
          const includePath = this.treeProvider.extractTranslationKey(
            capture.node,
          );
          const resolvedPath = this.resolveIncludePath(
            includePath,
            templateDir,
          );

          if (resolvedPath && fs.existsSync(resolvedPath)) {
            includeStatements.push({
              includePath,
              resolvedFilePath: resolvedPath,
              lineNumber: capture.node.startPosition.row,
              startPosition: capture.node.startPosition,
              endPosition: capture.node.endPosition,
            });

            this.logger.debug(
              `Found include: "${includePath}" -> ${resolvedPath} at line ${capture.node.startPosition.row}`,
            );
          } else {
            this.logger.warn(
              `Include file not found: "${includePath}" -> ${resolvedPath}`,
            );
          }
        }
      }
    }

    // Sort by line number to maintain execution order
    return includeStatements.sort((a, b) => a.lineNumber - b.lineNumber);
  }

  /**
   * Resolve include path to actual file path
   */
  private resolveIncludePath(
    includePath: string,
    templateDir: string,
  ): string | null {
    const possiblePaths: string[] = [];

    // Handle includes that start with "parts/" - these map to text_parts/ directory
    if (includePath.startsWith("parts/")) {
      const partName = includePath.substring(6); // Remove "parts/" prefix
      possiblePaths.push(
        // Map "parts/any_name" -> "text_parts/any_name.liquid"
        path.resolve(templateDir, "text_parts", `${partName}.liquid`),
        path.resolve(templateDir, "text_parts", partName),
      );
    }

    // Standard resolution paths
    possiblePaths.push(
      // Direct path relative to template directory
      path.resolve(templateDir, `${includePath}.liquid`),
      path.resolve(templateDir, includePath),

      // Path in text_parts directory (for non-prefixed includes)
      path.resolve(templateDir, "text_parts", `${includePath}.liquid`),
      path.resolve(templateDir, "text_parts", includePath),

      // Future: Path in actual parts directory (for shared_parts support)
      path.resolve(templateDir, "parts", `${includePath}.liquid`),
      path.resolve(templateDir, "parts", includePath),
    );
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        this.logger.debug(
          `Resolved include "${includePath}" to: ${possiblePath}`,
        );
        return possiblePath;
      }
    }

    this.logger.debug(`Could not resolve include path: ${includePath}`);
    return null;
  }

  /**
   * Search for translation in current file up to specified line
   */
  private searchInCurrentFileScope(
    filePath: string,
    translationKey: string,
    maxLine: number,
  ): TranslationDefinitionResult | null {
    try {
      const fileContent = fs.readFileSync(filePath, "utf8");
      const parsedTree = this.treeProvider.parseText(fileContent);

      if (!parsedTree) {
        return null;
      }

      // Find all translation definitions in the file
      const definitions =
        this.treeProvider.findTranslationDefinitions(parsedTree);

      for (const match of definitions) {
        for (const capture of match.captures) {
          if (
            capture.name === "translation_key" &&
            this.treeProvider.extractTranslationKey(capture.node) ===
              translationKey
          ) {
            // Check if this definition is within scope (before cursor line)
            if (capture.node.startPosition.row <= maxLine) {
              const parent = this.getTranslationStatementParent(capture.node);
              if (parent) {
                const content =
                  this.treeProvider.extractTranslationDefinitionContent(parent);
                return {
                  definition: parent,
                  filePath,
                  content,
                };
              }
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error searching current file scope: ${error}`);
    }

    return null;
  }

  /**
   * Search for translation in included file (all lines)
   */
  private searchInIncludedFile(
    filePath: string,
    translationKey: string,
  ): TranslationDefinitionResult | null {
    try {
      const fileContent = fs.readFileSync(filePath, "utf8");
      const parsedTree = this.treeProvider.parseText(fileContent);

      if (!parsedTree) {
        return null;
      }

      const definition = this.treeProvider.findTranslationDefinitionByKey(
        parsedTree,
        translationKey,
      );

      if (definition) {
        const content =
          this.treeProvider.extractTranslationDefinitionContent(definition);
        return {
          definition,
          filePath,
          content,
        };
      }
    } catch (error) {
      this.logger.error(`Error searching included file: ${error}`);
    }

    return null;
  }

  /**
   * Get the main template directory (where config.json is located)
   */
  private getMainTemplateDirectory(filePath: string): string {
    let currentDir = path.dirname(filePath);

    // Check current directory for config.json
    if (fs.existsSync(path.join(currentDir, "config.json"))) {
      return currentDir;
    }

    // Check parent directory (for files in text_parts/)
    const parentDir = path.dirname(currentDir);
    if (fs.existsSync(path.join(parentDir, "config.json"))) {
      return parentDir;
    }

    // Fallback to current directory
    this.logger.warn(`Could not find main template directory for: ${filePath}`);
    return currentDir;
  }

  /**
   * Get the translation_statement parent node
   */
  private getTranslationStatementParent(
    node: Parser.SyntaxNode,
  ): Parser.SyntaxNode | null {
    let parent = node.parent;
    while (parent && parent.type !== "translation_statement") {
      parent = parent.parent;
    }
    return parent;
  }
}
