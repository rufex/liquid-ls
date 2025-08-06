import { Logger } from "./logger";
import { URI } from "vscode-uri";
import * as fs from "fs";
import * as path from "path";

export interface TemplateConfig {
  text_parts?: string[] | Record<string, string>;
  [key: string]: unknown;
}

export interface RelatedFiles {
  mainFile: string;
  textParts: string[];
  allFiles: string[];
}

export class RelatedFilesProvider {
  private logger: Logger;

  constructor() {
    this.logger = new Logger("RelatedFilesProvider");
  }

  /**
   * Get all related files for a template, including the main file and text parts
   * @param templateUri The URI of the main template file
   * @returns RelatedFiles object containing all related file paths
   */
  public getRelatedFiles(templateUri: string): RelatedFiles {
    this.logger.debug(`Getting related files for: ${templateUri}`);

    const mainFilePath = URI.parse(templateUri).fsPath;
    const templateDir = path.dirname(mainFilePath);
    const configPath = path.join(templateDir, "config.json");

    const result: RelatedFiles = {
      mainFile: mainFilePath,
      textParts: [],
      allFiles: [mainFilePath],
    };

    try {
      // Check if config.json exists
      if (!fs.existsSync(configPath)) {
        this.logger.debug(`No config.json found at: ${configPath}`);
        return result;
      }

      // Read and parse config.json
      const configContent = fs.readFileSync(configPath, "utf8");
      this.logger.debug(`Config file content length: ${configContent.length}`);

      const config: TemplateConfig = JSON.parse(configContent);
      this.logger.debug(
        `Parsed config keys: ${Object.keys(config).join(", ")}`,
      );
      this.logger.debug(`Config text_parts type: ${typeof config.text_parts}`);
      this.logger.debug(
        `Config text_parts: ${JSON.stringify(config.text_parts)}`,
      );

      if (!config.text_parts) {
        this.logger.debug("No text_parts found in config.json");
        return result;
      }

      // Handle both array and object formats for text_parts
      let textPartPaths: string[] = [];
      if (Array.isArray(config.text_parts)) {
        textPartPaths = config.text_parts;
      } else if (typeof config.text_parts === "object") {
        textPartPaths = Object.values(config.text_parts);
        this.logger.debug(
          `Found text_parts object with keys: ${Object.keys(config.text_parts).join(", ")}`,
        );
      } else {
        this.logger.debug("text_parts is not an array or object");
        return result;
      }

      // Resolve text_parts paths relative to the template directory
      const textParts: string[] = [];
      for (const textPart of textPartPaths) {
        const resolvedPath = path.resolve(templateDir, textPart);

        // Check if the file exists
        if (fs.existsSync(resolvedPath)) {
          textParts.push(resolvedPath);
        } else {
          this.logger.warn(`Text part file not found: ${resolvedPath}`);
        }
      }

      result.textParts = textParts;
      result.allFiles = [mainFilePath, ...textParts];

      this.logger.debug(`Found ${textParts.length} text parts for template`);
      return result;
    } catch (error) {
      this.logger.error(`Error reading config.json: ${error}`);
      return result;
    }
  }

  /**
   * Get all template files (main + text parts) as an array of file paths
   * @param templateUri The URI of the main template file
   * @returns Array of file paths
   */
  public getAllTemplateFiles(templateUri: string): string[] {
    const relatedFiles = this.getRelatedFiles(templateUri);
    return relatedFiles.allFiles;
  }

  /**
   * Get only the text part files for a template
   * @param templateUri The URI of the main template file
   * @returns Array of text part file paths
   */
  public getTextPartFiles(templateUri: string): string[] {
    const relatedFiles = this.getRelatedFiles(templateUri);
    return relatedFiles.textParts;
  }

  /**
   * Check if a file is part of a template (either main file or text part)
   * @param fileUri The URI of the file to check
   * @param templateUri The URI of the main template file
   * @returns True if the file is part of the template
   */
  public isPartOfTemplate(fileUri: string, templateUri: string): boolean {
    const filePath = URI.parse(fileUri).fsPath;
    const relatedFiles = this.getRelatedFiles(templateUri);
    return relatedFiles.allFiles.includes(filePath);
  }

  /**
   * Get the main template file for a given file (useful when starting from a text part)
   * Since config.json always exists in the template root directory, we can simplify the logic
   * @param fileUri The URI of any file in the template
   * @returns The path to the main template file, or the file itself if no config found
   */
  public getMainTemplateFile(fileUri: string): string | null {
    const filePath = URI.parse(fileUri).fsPath;
    const fileDir = path.dirname(filePath);

    this.logger.debug(`Getting main template file for: ${filePath}`);
    this.logger.debug(`File directory: ${fileDir}`);

    // First, try current directory for config.json
    let configPath = path.join(fileDir, "config.json");
    let templateDir = fileDir;

    this.logger.debug(`Checking for config.json at: ${configPath}`);

    // If not found, try parent directory (for text parts in subdirectories like text_parts/)
    if (!fs.existsSync(configPath)) {
      const parentDir = path.dirname(fileDir);
      configPath = path.join(parentDir, "config.json");
      templateDir = parentDir;

      this.logger.debug(
        `Config not found, trying parent directory: ${configPath}`,
      );

      // If still not found, assume this is the main file
      if (!fs.existsSync(configPath)) {
        this.logger.debug(`No config.json found for file: ${filePath}`);
        return filePath;
      }
    }

    this.logger.debug(`Found config.json at: ${configPath}`);
    this.logger.debug(`Template directory: ${templateDir}`);

    try {
      const configContent = fs.readFileSync(configPath, "utf8");
      const config: TemplateConfig = JSON.parse(configContent);

      if (!config.text_parts) {
        return filePath;
      }

      // Handle both array and object formats for text_parts
      let textPartPaths: string[] = [];
      if (Array.isArray(config.text_parts)) {
        textPartPaths = config.text_parts;
      } else if (typeof config.text_parts === "object") {
        textPartPaths = Object.values(config.text_parts);
      } else {
        return filePath;
      }

      // Check if the current file is listed as a text part (relative to template directory)
      const isTextPart = textPartPaths.some((textPart: string) => {
        const resolvedPath = path.resolve(templateDir, textPart);
        this.logger.debug(
          `Checking text part: ${textPart} -> ${resolvedPath} vs ${filePath}`,
        );
        return resolvedPath === filePath;
      });

      this.logger.debug(`Is current file a text part? ${isTextPart}`);

      if (isTextPart) {
        // Look for the main template file (typically the .liquid file that's not in text_parts)
        const files = fs.readdirSync(templateDir);
        const liquidFiles = files.filter((file) => file.endsWith(".liquid"));

        for (const liquidFile of liquidFiles) {
          const liquidPath = path.join(templateDir, liquidFile);
          const isInTextParts = textPartPaths.some((textPart: string) => {
            const resolvedPath = path.resolve(templateDir, textPart);
            return resolvedPath === liquidPath;
          });

          if (!isInTextParts) {
            this.logger.debug(`Found main template file: ${liquidPath}`);
            return liquidPath;
          }
        }

        // If no main file found, return the first liquid file in template dir
        if (liquidFiles.length > 0) {
          const fallbackPath = path.join(templateDir, liquidFiles[0]);
          this.logger.debug(
            `Using fallback main template file: ${fallbackPath}`,
          );
          return fallbackPath;
        }
      }

      return filePath;
    } catch (error) {
      this.logger.error(`Error determining main template file: ${error}`);
      return filePath;
    }
  }
}
