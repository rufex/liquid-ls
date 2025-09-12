import { Logger } from "../logger";
import * as fs from "fs";
import * as path from "path";
import { TreeSitterLiquidProvider } from "../liquid/treeSitterLiquidProvider";
import {
  TemplateTypes,
  TemplateParts,
  IncludeTagInfo,
  TemplatePartType,
  TemplateDirectories,
} from "../types";

/**
 * Class to map out the parts of a Liquid template, including main, text parts, and shared parts.
 * It processes the main template and recursively resolves includes to build an ordered list of template parts.
 * Each part includes its type, name, and line range within the overall template structure.
 * Returns an ordered array of template parts with their line ranges.
 *
 * @example
 * const mapper = new TemplatePartsMapper(workspaceRoot);
 * const templateMap = mapper.generateTemplateMap('reconciliationText', 'reconciliation_handle');
 * console.log(templateMap);
 * // Output:
 * [
 *   { type: 'main', name: 'main', startLine: 0, endLine: 10 },
 *   { type: 'textPart', name: 'greeting', startLine: 1, endLine: 20 },
 *   { type: 'main', name: 'main', startLine: 11, endLine: 16 },
 *   { type: 'sharedPart', name: 'footer', startLine: 1, endLine: 12 },
 *   { type: 'main', name: 'main', startLine: 17, endLine: 25 },
 *  ]
 */
export class TemplatePartsMapper {
  private logger: Logger = new Logger("TemplatePartsMapper", {
    consoleLog: true,
  });
  private workspaceRoot!: string;
  private parser: TreeSitterLiquidProvider = new TreeSitterLiquidProvider();

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  public generateTemplateMap(
    templateType: TemplateTypes,
    templateName: string,
  ): TemplateParts | null {
    const orderedTemplateParts: TemplateParts = [];

    const templateDir = path.join(
      this.workspaceRoot,
      TemplateDirectories[templateType],
      templateName,
    );
    if (!fs.existsSync(templateDir)) {
      this.logger.warn(`Template directory does not exist: ${templateDir}`);
      return null;
    }

    const mainTemplatePath = path.join(templateDir, "main.liquid");

    if (!fs.existsSync(mainTemplatePath)) {
      this.logger.warn(`Main template does not exist: ${mainTemplatePath}`);
      return null;
    }

    const mainLiquid = fs.readFileSync(mainTemplatePath, "utf-8");
    const mainTree = this.parser.parseText(mainLiquid);

    if (!mainTree) {
      this.logger.error(`Failed to parse main template: ${mainTemplatePath}`);
      return null;
    }

    const processedFiles = new Set<string>(); // Prevent circular includes

    // Start recursive processing with main template
    this.processLiquidFileRecursively(
      mainTemplatePath,
      "main",
      "main",
      templateDir,
      orderedTemplateParts,
      processedFiles,
    );

    this.logger.debug(JSON.stringify(orderedTemplateParts, null, 2));

    return orderedTemplateParts;
  }

  /**
   * Recursively processes a template file and its includes to build ordered template parts
   * @param filePath The path to the template file to process
   * @param partType The type of this part (main, textPart, sharedPart)
   * @param partName The name of this part
   * @param templateDir The root template directory
   * @param orderedTemplateParts Array to accumulate template parts in order
   * @param processedFiles Set to track processed files and prevent circular includes
   */
  private processLiquidFileRecursively(
    filePath: string,
    partType: TemplatePartType,
    partName: string,
    templateDir: string,
    orderedTemplateParts: TemplateParts,
    processedFiles: Set<string>,
  ): void {
    // Prevent circular includes
    if (processedFiles.has(filePath)) {
      this.logger.warn(`Circular include detected: ${filePath}`);
      return;
    }
    processedFiles.add(filePath);

    if (!fs.existsSync(filePath)) {
      this.logger.warn(`Template file does not exist: ${filePath}`);
      return;
    }

    this.logger.debug(`Processing file: ${filePath}`);

    const fileContent = fs.readFileSync(filePath, "utf-8");
    const tree = this.parser.parseText(fileContent);

    if (!tree) {
      this.logger.error(`Failed to parse template: ${filePath}`);
      return;
    }

    const includeTags = this.parser.findAllIncludeTags(tree);
    const totalLines = fileContent.split("\n").length;

    // Process includes and create template parts in order
    let currentStartLine = 0; // 0-based indexing

    for (const includeTag of includeTags) {
      const includeLineNumber = includeTag.lineNumber; // Already 0-based from TreeSitter

      // Add template part before the include (if there are lines before it)
      if (currentStartLine < includeLineNumber) {
        orderedTemplateParts.push({
          fileFullPath: filePath,
          type: partType,
          name: partName,
          startLine: currentStartLine,
          endLine: includeLineNumber - 1,
        });
      }

      // Recursively process the included file
      const includedFilePath = this.resolveIncludedPartFilePath(
        includeTag,
        templateDir,
      );
      if (includedFilePath) {
        this.processLiquidFileRecursively(
          includedFilePath,
          includeTag.type,
          includeTag.name,
          templateDir,
          orderedTemplateParts,
          processedFiles,
        );
      }

      // Continue from the line after the include
      currentStartLine = includeLineNumber + 1;
    }

    // Add the remaining part of the file (after last include or whole file if no includes)
    if (currentStartLine < totalLines) {
      orderedTemplateParts.push({
        fileFullPath: filePath,
        type: partType,
        name: partName,
        startLine: currentStartLine,
        endLine: totalLines - 1, // Last line is totalLines - 1 in 0-based indexing
      });
    }

    // Remove from processed files to allow processing the same file in different contexts
    processedFiles.delete(filePath);
  }

  /**
   * Resolves the file path for an included part based on its type
   * @param includeTag The include tag information from TreeSitter
   * @param templateDir The current template directory
   * @returns The resolved file path or null if file doesn't exist
   */
  private resolveIncludedPartFilePath(
    includeTag: IncludeTagInfo,
    templateDir: string,
  ): string | null {
    let partFilePath: string;

    if (includeTag.type === "textPart") {
      // Text parts are relative to the template directory in text_parts folder
      partFilePath = path.join(
        templateDir,
        "text_parts",
        `${includeTag.name}.liquid`,
      );
    } else if (includeTag.type === "sharedPart") {
      // Shared parts are relative to workspace root in shared_parts/{name}/{name}.liquid structure
      partFilePath = path.join(
        this.workspaceRoot,
        TemplateDirectories.sharedPart,
        includeTag.name,
        `${includeTag.name}.liquid`,
      );
    } else {
      this.logger.warn(`Unknown include type: ${includeTag.type}`);
      return null;
    }

    if (!fs.existsSync(partFilePath)) {
      this.logger.warn(`Part file does not exist: ${partFilePath}`);
      return null;
    }

    this.logger.debug(
      `Resolved part file: ${includeTag.type}/${includeTag.name} -> ${partFilePath}`,
    );
    return partFilePath;
  }
}
