import { TreeSitterLiquidProvider } from "./liquid/treeSitterLiquidProvider";
import { Logger } from "./logger";
import { URI } from "vscode-uri";
import * as fs from "fs";
import * as path from "path";
import { SharedPartsProvider } from "./sharedPartsProvider";
import * as Parser from "tree-sitter";

interface TemplateConfig {
  text_parts?: string[] | Record<string, string>;
  [key: string]: unknown;
}

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

export interface VariableDefinitionResult {
  definition: Parser.SyntaxNode;
  filePath: string;
  variableName: string;
  lineNumber: number;
}

export interface MultipleVariableDefinitionsResult {
  definitions: VariableDefinitionResult[];
  variableName: string;
}

export class ScopeAwareProvider {
  private logger: Logger;
  private treeProvider: TreeSitterLiquidProvider;
  private sharedPartsProvider: SharedPartsProvider | null = null;

  constructor(workspaceRoot?: string) {
    this.logger = new Logger("ScopeAwareProvider");
    this.treeProvider = new TreeSitterLiquidProvider();
    if (workspaceRoot) {
      this.sharedPartsProvider = new SharedPartsProvider(workspaceRoot);
    }
  }

  /**
   * Find variable definition respecting Liquid execution scope
   * @param fileUri URI of the current file
   * @param variableName The variable name to find
   * @param cursorLine The line number where the cursor is (0-based)
   * @returns Variable definition result or null
   */
  public findScopedVariableDefinition(
    fileUri: string,
    variableName: string,
    cursorLine: number,
  ): VariableDefinitionResult | null {
    this.logger.debug(
      `Finding scoped variable '${variableName}' at line ${cursorLine} in ${fileUri}`,
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

    // TODO: CRITICAL - This is a temporary implementation that doesn't correctly model
    // Liquid execution order. We need to implement a proper ExecutionTimelineBuilder
    // that builds a complete execution timeline to handle variable precedence correctly.
    // See: claude/liquid-execution-order-specification.md
    //
    // Current approach: Search for ALL variable definitions, then return the MOST RECENT one
    // This is incorrect for complex include scenarios and needs to be replaced.

    const allDefinitions: Array<{
      result: VariableDefinitionResult;
      executionOrder: number;
    }> = [];

    // 1. Search current file up to cursor line (execution order based on line number)
    const currentFileResult = this.searchVariableInCurrentFileScope(
      scopeContext.currentFile,
      variableName,
      scopeContext.currentLine,
    );

    if (currentFileResult) {
      allDefinitions.push({
        result: currentFileResult,
        executionOrder: currentFileResult.lineNumber,
      });
    }

    // 2. Search included files (execution order based on include order + line number)
    for (let i = 0; i < scopeContext.availableIncludes.length; i++) {
      const includeStmt = scopeContext.availableIncludes[i];
      const includedFileResult = this.searchVariableInIncludedFile(
        includeStmt.resolvedFilePath,
        variableName,
      );

      if (includedFileResult) {
        // Execution order: include line number * 1000 + definition line number
        // This ensures includes are processed after their include statement
        const executionOrder =
          includeStmt.lineNumber * 1000 + includedFileResult.lineNumber;
        allDefinitions.push({
          result: includedFileResult,
          executionOrder: executionOrder,
        });
      }
    }

    // 3. If we're in a part file, search the main template file
    const templateDir = this.getMainTemplateDirectory(
      URI.parse(fileUri).fsPath,
    );
    const templateRoot = path.join(templateDir, "main.liquid");
    const isPartFile =
      path.resolve(scopeContext.currentFile) !== path.resolve(templateRoot);

    if (isPartFile) {
      const mainTemplateResult = this.searchVariableInIncludedFile(
        templateRoot,
        variableName,
      );

      if (mainTemplateResult) {
        // Main template definitions have lower execution order (executed first)
        allDefinitions.push({
          result: mainTemplateResult,
          executionOrder: mainTemplateResult.lineNumber - 10000,
        });
      }
    }

    // Return the definition with the HIGHEST execution order (most recent)
    if (allDefinitions.length > 0) {
      const mostRecentDefinition = allDefinitions.reduce((latest, current) =>
        current.executionOrder > latest.executionOrder ? current : latest,
      );

      this.logger.debug(
        `Found most recent variable definition in: ${mostRecentDefinition.result.filePath} (execution order: ${mostRecentDefinition.executionOrder})`,
      );
      return mostRecentDefinition.result;
    }

    this.logger.debug(`No scoped variable found for '${variableName}'`);
    return null;
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
    // 2. Main template file (if we're in a part file)
    // 3. Included files (in inclusion order, all lines)

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

    // If we're in a part file, search the main template file
    const templateDir = this.getMainTemplateDirectory(
      URI.parse(fileUri).fsPath,
    );
    const templateRoot = path.join(templateDir, "main.liquid");
    const isPartFile =
      path.resolve(scopeContext.currentFile) !== path.resolve(templateRoot);

    if (isPartFile) {
      // Search main template file up to the point where this part was included
      const mainTemplateResult = this.searchInIncludedFile(
        templateRoot,
        translationKey,
      );

      if (mainTemplateResult) {
        this.logger.debug(
          `Found translation in main template file: ${templateRoot}`,
        );
        return mainTemplateResult;
      }
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
    // Get the template root (main.liquid)
    const templateDir = this.getMainTemplateDirectory(filePath);
    const templateRoot = path.join(templateDir, "main.liquid");

    // If we're calling from main.liquid, use simple logic
    if (path.resolve(filePath) === path.resolve(templateRoot)) {
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

    // For part files, build template-centric execution chain
    const allIncludes = this.buildTemplatecentricExecutionChain(
      templateRoot,
      filePath,
      cursorLine,
    );

    return {
      currentFile: filePath,
      currentLine: cursorLine,
      availableIncludes: allIncludes,
      scopedFiles: [
        templateRoot,
        ...allIncludes.map((inc) => inc.resolvedFilePath),
      ],
    };
  }

  /**
   * Build template-centric execution chain for part files
   */
  private buildTemplatecentricExecutionChain(
    templateRoot: string,
    originatingFile: string,
    cursorLine: number,
  ): IncludeStatement[] {
    const executionChain: IncludeStatement[] = [];

    // Step 1: Find where the originating file is included in the template
    const inclusionPoint = this.findInclusionPoint(
      templateRoot,
      originatingFile,
    );

    if (!inclusionPoint) {
      this.logger.warn(
        `Could not find inclusion point for ${originatingFile} in template ${templateRoot}`,
      );
      // Fallback to original logic
      return this.buildExecutionChain(originatingFile, cursorLine);
    }

    // Step 2: Build execution chain up to the inclusion point
    this.buildExecutionChainUpToPoint(
      templateRoot,
      inclusionPoint,
      executionChain,
    );

    // Step 3: Add includes from the originating file up to cursor line
    this.addIncludesFromOriginatingFile(
      originatingFile,
      cursorLine,
      executionChain,
    );

    return executionChain;
  }

  /**
   * Find where a file is included in the template hierarchy
   */
  private findInclusionPoint(
    templateRoot: string,
    targetFile: string,
  ): { includingFile: string; lineNumber: number } | null {
    const processedFiles = new Set<string>();

    const searchInFile = (
      currentFile: string,
    ): { includingFile: string; lineNumber: number } | null => {
      if (processedFiles.has(currentFile)) {
        return null;
      }
      processedFiles.add(currentFile);

      try {
        const fileContent = fs.readFileSync(currentFile, "utf8");
        const parsedTree = this.treeProvider.parseText(fileContent);

        if (!parsedTree) {
          return null;
        }

        const includeStatements = this.findIncludeStatements(
          parsedTree,
          currentFile,
        );

        for (const includeStmt of includeStatements) {
          // Check if this include resolves to our target file
          if (
            path.resolve(includeStmt.resolvedFilePath) ===
            path.resolve(targetFile)
          ) {
            return {
              includingFile: currentFile,
              lineNumber: includeStmt.lineNumber,
            };
          }

          // Recursively search in included files
          const result = searchInFile(includeStmt.resolvedFilePath);
          if (result) {
            return result;
          }
        }
      } catch (error) {
        this.logger.error(`Error searching in file ${currentFile}: ${error}`);
      }

      return null;
    };

    return searchInFile(templateRoot);
  }

  /**
   * Build execution chain up to the inclusion point
   */
  private buildExecutionChainUpToPoint(
    currentFile: string,
    inclusionPoint: { includingFile: string; lineNumber: number },
    executionChain: IncludeStatement[],
  ): void {
    const processedFiles = new Set<string>();

    const processFile = (filePath: string) => {
      if (processedFiles.has(filePath)) {
        return;
      }
      processedFiles.add(filePath);

      try {
        const fileContent = fs.readFileSync(filePath, "utf8");
        const parsedTree = this.treeProvider.parseText(fileContent);

        if (!parsedTree) {
          return;
        }

        const includeStatements = this.findIncludeStatements(
          parsedTree,
          filePath,
        );

        for (const includeStmt of includeStatements) {
          // If this is the inclusion point, stop here
          if (
            path.resolve(filePath) ===
              path.resolve(inclusionPoint.includingFile) &&
            includeStmt.lineNumber === inclusionPoint.lineNumber
          ) {
            break;
          }

          // Add this include to the chain
          executionChain.push(includeStmt);

          // Recursively process the included file
          processFile(includeStmt.resolvedFilePath);
        }
      } catch (error) {
        this.logger.error(`Error processing file ${filePath}: ${error}`);
      }
    };

    processFile(currentFile);
  }

  /**
   * Add includes from the originating file up to cursor line
   */
  private addIncludesFromOriginatingFile(
    originatingFile: string,
    cursorLine: number,
    executionChain: IncludeStatement[],
  ): void {
    try {
      const fileContent = fs.readFileSync(originatingFile, "utf8");
      const parsedTree = this.treeProvider.parseText(fileContent);

      if (!parsedTree) {
        return;
      }

      const includeStatements = this.findIncludeStatements(
        parsedTree,
        originatingFile,
      );

      // Only include statements up to the cursor line
      const relevantIncludes = includeStatements.filter(
        (include) => include.lineNumber <= cursorLine,
      );

      for (const includeStmt of relevantIncludes) {
        executionChain.push(includeStmt);

        // Recursively add all includes from this file
        this.addAllIncludesFromFile(
          includeStmt.resolvedFilePath,
          executionChain,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error adding includes from ${originatingFile}: ${error}`,
      );
    }
  }

  /**
   * Add all includes from a file (used for nested includes)
   */
  private addAllIncludesFromFile(
    filePath: string,
    executionChain: IncludeStatement[],
  ): void {
    const processedFiles = new Set<string>();

    const processFile = (currentFilePath: string) => {
      if (processedFiles.has(currentFilePath)) {
        return;
      }
      processedFiles.add(currentFilePath);

      try {
        const fileContent = fs.readFileSync(currentFilePath, "utf8");
        const parsedTree = this.treeProvider.parseText(fileContent);

        if (!parsedTree) {
          return;
        }

        const includeStatements = this.findIncludeStatements(
          parsedTree,
          currentFilePath,
        );

        for (const includeStmt of includeStatements) {
          executionChain.push(includeStmt);
          processFile(includeStmt.resolvedFilePath);
        }
      } catch (error) {
        this.logger.error(`Error processing file ${currentFilePath}: ${error}`);
      }
    };

    processFile(filePath);
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
   * Read and parse config.json for a template directory
   */
  private readTemplateConfig(templateDir: string): TemplateConfig | null {
    const configPath = path.join(templateDir, "config.json");

    try {
      if (!fs.existsSync(configPath)) {
        this.logger.debug(`No config.json found at: ${configPath}`);
        return null;
      }

      const configContent = fs.readFileSync(configPath, "utf8");
      const config: TemplateConfig = JSON.parse(configContent);

      this.logger.debug(`Loaded config from: ${configPath}`);
      return config;
    } catch (error) {
      this.logger.error(`Error reading config.json: ${error}`);
      return null;
    }
  }

  /**
   * Get text_parts mappings from config.json
   */
  private getTextPartsMapping(templateDir: string): Record<string, string> {
    const config = this.readTemplateConfig(templateDir);

    if (!config || !config.text_parts) {
      return {};
    }

    // Handle both array and object formats for text_parts
    if (Array.isArray(config.text_parts)) {
      // Convert array to object mapping (index-based keys)
      const mapping: Record<string, string> = {};
      config.text_parts.forEach((textPart, index) => {
        mapping[`part_${index}`] = textPart;
      });
      return mapping;
    } else if (typeof config.text_parts === "object") {
      return config.text_parts;
    }

    return {};
  }

  /**
   * Resolve include path to actual file path using config.json mappings
   */
  public resolveIncludePath(
    includePath: string,
    templateDir: string,
  ): string | null {
    const possiblePaths: string[] = [];

    // Handle includes that start with "shared/" - map to shared_parts
    if (includePath.startsWith("shared/") && this.sharedPartsProvider) {
      const sharedPartName = includePath.substring(7); // Remove "shared/" prefix
      const sharedPart = this.sharedPartsProvider.getSharedPart(sharedPartName);

      if (sharedPart) {
        // Validate that this template is allowed to use this shared part
        const templateHandle = this.getTemplateHandleFromPath(templateDir);
        if (
          templateHandle &&
          this.sharedPartsProvider.isSharedPartAllowedForTemplate(
            sharedPartName,
            templateHandle,
          )
        ) {
          this.logger.debug(
            `Found shared part: "${includePath}" -> ${sharedPart.filePath}`,
          );
          return sharedPart.filePath;
        } else {
          this.logger.warn(
            `Shared part "${sharedPartName}" is not allowed for template "${templateHandle}"`,
          );
          return null;
        }
      } else {
        this.logger.warn(`Shared part not found: "${sharedPartName}"`);
        return null;
      }
    }

    // First, try to resolve using config.json mappings
    const textPartsMapping = this.getTextPartsMapping(templateDir);

    // Handle includes that start with "parts/" - map to config.json text_parts
    if (includePath.startsWith("parts/")) {
      const partName = includePath.substring(6); // Remove "parts/" prefix

      // Look for exact match in config.json text_parts
      if (textPartsMapping[partName]) {
        const configPath = path.resolve(
          templateDir,
          textPartsMapping[partName],
        );
        possiblePaths.push(configPath);
        this.logger.debug(
          `Found config mapping: "${includePath}" -> "${textPartsMapping[partName]}" -> ${configPath}`,
        );
      }

      // Fallback: try standard text_parts directory structure
      possiblePaths.push(
        path.resolve(templateDir, "text_parts", `${partName}.liquid`),
        path.resolve(templateDir, "text_parts", partName),
      );
    }

    // For non-prefixed includes, check config.json mappings directly
    if (textPartsMapping[includePath]) {
      const configPath = path.resolve(
        templateDir,
        textPartsMapping[includePath],
      );
      possiblePaths.push(configPath);
      this.logger.debug(
        `Found config mapping: "${includePath}" -> "${textPartsMapping[includePath]}" -> ${configPath}`,
      );
    }

    // Standard resolution paths (fallback)
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

    // Try each possible path until we find one that exists
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
   * Search for variable in current file up to specified line
   */
  private searchVariableInCurrentFileScope(
    filePath: string,
    variableName: string,
    maxLine: number,
  ): VariableDefinitionResult | null {
    try {
      const fileContent = fs.readFileSync(filePath, "utf8");
      const parsedTree = this.treeProvider.parseText(fileContent);

      if (!parsedTree) {
        return null;
      }

      // Find all variable definitions in the file
      const definitions = this.treeProvider.findVariableDefinitions(parsedTree);

      for (const match of definitions) {
        for (const capture of match.captures) {
          if (
            capture.name === "variable_name" &&
            capture.node.text === variableName
          ) {
            // Check if this definition is within scope (before cursor line)
            if (capture.node.startPosition.row <= maxLine) {
              return {
                definition: capture.node,
                filePath,
                variableName,
                lineNumber: capture.node.startPosition.row,
              };
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Error searching current file scope for variable: ${error}`,
      );
    }

    return null;
  }

  /**
   * Search for variable in included file (all lines)
   */
  private searchVariableInIncludedFile(
    filePath: string,
    variableName: string,
  ): VariableDefinitionResult | null {
    try {
      const fileContent = fs.readFileSync(filePath, "utf8");
      const parsedTree = this.treeProvider.parseText(fileContent);

      if (!parsedTree) {
        return null;
      }

      const definition = this.treeProvider.findVariableDefinitionByName(
        parsedTree,
        variableName,
      );

      if (definition) {
        return {
          definition,
          filePath,
          variableName,
          lineNumber: definition.startPosition.row,
        };
      }
    } catch (error) {
      this.logger.error(`Error searching included file for variable: ${error}`);
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
   * Extract template handle from template directory path
   */
  private getTemplateHandleFromPath(templateDir: string): string | null {
    try {
      const pathParts = templateDir.split(path.sep);

      // Look for template type directories and extract the template name
      for (let i = 0; i < pathParts.length - 1; i++) {
        const currentPart = pathParts[i];
        if (
          [
            "account_templates",
            "reconciliation_texts",
            "export_files",
          ].includes(currentPart)
        ) {
          const templateName = pathParts[i + 1];
          if (templateName) {
            return templateName;
          }
        }
      }

      return null;
    } catch (error) {
      this.logger.error(`Error extracting template handle from path: ${error}`);
      return null;
    }
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
