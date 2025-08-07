import * as fs from "fs";
import * as path from "path";
import { URI } from "vscode-uri";
import { Logger } from "./logger";

export interface SharedPartConfig {
  name: string;
  text: string;
  used_in: Array<{
    type: string;
    handle: string;
    id?: Record<string, number>;
    partner_id?: Record<string, number>;
  }>;
  externally_managed?: boolean;
}

export interface SharedPartMapping {
  name: string;
  filePath: string;
  usedInTemplates: Set<string>;
}

export class SharedPartsProvider {
  private sharedPartsMap = new Map<string, SharedPartMapping>();
  private templateToSharedParts = new Map<string, Set<string>>();
  private logger: Logger;

  constructor(private workspaceRoot: string) {
    this.logger = new Logger("SharedPartsProvider");
    this.discoverSharedParts();
  }

  private discoverSharedParts(): void {
    this.logger.info("Discovering shared parts...");
    this.sharedPartsMap.clear();
    this.templateToSharedParts.clear();

    const sharedPartsDir = path.join(this.workspaceRoot, "shared_parts");
    if (!fs.existsSync(sharedPartsDir)) {
      this.logger.info("No shared_parts directory found");
      return;
    }

    try {
      const entries = fs.readdirSync(sharedPartsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          this.processSharedPartDirectory(
            path.join(sharedPartsDir, entry.name),
          );
        }
      }

      this.logger.info(`Discovered ${this.sharedPartsMap.size} shared parts`);
    } catch (error) {
      this.logger.error(`Error discovering shared parts: ${error}`);
    }
  }

  private processSharedPartDirectory(dirPath: string): void {
    const configPath = path.join(dirPath, "config.json");

    if (!fs.existsSync(configPath)) {
      this.logger.warn(
        `No config.json found in shared part directory: ${dirPath}`,
      );
      return;
    }

    try {
      const configContent = fs.readFileSync(configPath, "utf-8");
      const config: SharedPartConfig = JSON.parse(configContent);

      if (!config.name || !config.text) {
        this.logger.warn(
          `Invalid shared part config in ${configPath}: missing name or text`,
        );
        return;
      }

      const liquidFilePath = path.join(dirPath, config.text);
      if (!fs.existsSync(liquidFilePath)) {
        this.logger.warn(
          `Shared part liquid file not found: ${liquidFilePath}`,
        );
        return;
      }

      const usedInTemplates = new Set<string>();

      if (config.used_in && Array.isArray(config.used_in)) {
        for (const usage of config.used_in) {
          if (usage.handle) {
            usedInTemplates.add(usage.handle);

            let templateSharedParts = this.templateToSharedParts.get(
              usage.handle,
            );
            if (!templateSharedParts) {
              templateSharedParts = new Set();
              this.templateToSharedParts.set(usage.handle, templateSharedParts);
            }
            templateSharedParts.add(config.name);
          }
        }
      }

      this.sharedPartsMap.set(config.name, {
        name: config.name,
        filePath: liquidFilePath,
        usedInTemplates,
      });

      this.logger.debug(
        `Registered shared part: ${config.name} -> ${liquidFilePath}`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing shared part config ${configPath}: ${error}`,
      );
    }
  }

  public getSharedPart(name: string): SharedPartMapping | undefined {
    return this.sharedPartsMap.get(name);
  }

  public getSharedPartsForTemplate(templateHandle: string): Set<string> {
    return this.templateToSharedParts.get(templateHandle) || new Set();
  }

  public isSharedPartAllowedForTemplate(
    sharedPartName: string,
    templateHandle: string,
  ): boolean {
    const sharedPart = this.sharedPartsMap.get(sharedPartName);
    if (!sharedPart) {
      return false;
    }

    return sharedPart.usedInTemplates.has(templateHandle);
  }

  public getAllSharedParts(): Map<string, SharedPartMapping> {
    return new Map(this.sharedPartsMap);
  }

  public refreshSharedParts(): void {
    this.logger.info("Refreshing shared parts mapping...");
    this.discoverSharedParts();
  }

  public getTemplateHandleFromUri(uri: string): string | undefined {
    try {
      const fsPath = URI.parse(uri).fsPath;
      const relativePath = path.relative(this.workspaceRoot, fsPath);
      const pathParts = relativePath.split(path.sep);

      if (pathParts.length >= 2) {
        const templateType = pathParts[0];
        const templateName = pathParts[1];

        if (
          [
            "account_templates",
            "reconciliation_texts",
            "export_files",
          ].includes(templateType)
        ) {
          return templateName;
        }
      }

      return undefined;
    } catch (error) {
      this.logger.error(`Error extracting template handle from URI: ${error}`);
      return undefined;
    }
  }
}
