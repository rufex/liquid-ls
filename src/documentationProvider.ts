import { Logger } from "./logger";
import * as fs from "fs";
import * as path from "path";

export class DocumentationProvider {
  private logger: Logger;
  private docsPath: string;
  private documentationCache: Map<string, string>;

  constructor(workspaceRoot?: string) {
    this.logger = new Logger("DocumentationProvider");
    this.docsPath = workspaceRoot
      ? path.join(workspaceRoot, "docs", "tags")
      : path.join(__dirname, "..", "docs", "tags");
    this.documentationCache = new Map();
  }

  /**
   * Get hover content for a tag
   * @param tagName The name of the tag to get hover content for
   * @returns Markdown content if available, null otherwise
   */
  getTagHoverContent(tagName: string): string | null {
    const documentation = this.getTagDocumentation(tagName);

    if (documentation && documentation.trim().length > 0) {
      this.logger.debug(`Returning documentation content for tag: ${tagName}`);
      return documentation;
    }

    this.logger.debug(`No hover content available for tag: ${tagName}`);
    return null;
  }

  /**
   * Get documentation content for a specific tag
   * @param tagName The name of the tag to look up
   * @returns Markdown content if found, null otherwise
   */
  private getTagDocumentation(tagName: string): string | null {
    // Lookup in cache
    if (this.documentationCache.has(tagName)) {
      const cached = this.documentationCache.get(tagName)!;
      this.logger.debug(`Retrieved cached documentation for tag: ${tagName}`);
      return cached;
    }

    // Read from file system
    const content = this.getDocumentationFromFile(tagName);

    if (content) {
      this.documentationCache.set(tagName, content);
      this.logger.debug(`Cached documentation for tag: ${tagName}`);
      return content;
    }

    this.logger.debug(`No documentation found for tag: ${tagName}`);
    return null;
  }

  /**
   * Get documentation content for a specific tag from file system
   * @param tagName The name of the tag to look up
   * @returns Markdown content if found, null otherwise
   */
  private getDocumentationFromFile(tagName: string): string | null {
    const filePath = path.join(this.docsPath, `${tagName}.md`);

    try {
      if (!fs.existsSync(filePath)) {
        this.logger.debug(`Documentation file not found: ${filePath}`);
        return null;
      }

      const content = fs.readFileSync(filePath, "utf8");
      this.logger.debug(`Read documentation for tag: ${tagName}`);
      return content;
    } catch (error) {
      this.logger.error(
        `Error reading documentation file ${filePath}: ${error}`,
      );
      return null;
    }
  }
}
