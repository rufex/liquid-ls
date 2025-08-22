import { Logger } from "./logger";

export interface TagDocumentationEntry {
  tagName: string;
  documentationUrl: string;
}

export class TagDocumentationProvider {
  private logger: Logger;
  private knownTags: Map<string, TagDocumentationEntry>;

  constructor() {
    this.logger = new Logger("TagDocumentationProvider");
    this.knownTags = new Map();
    this.initializeKnownTags();
  }

  /**
   * Initialize the registry with known Liquid tags and their documentation URLs
   */
  private initializeKnownTags(): void {
    const tags: TagDocumentationEntry[] = [
      {
        tagName: "unreconciled",
        documentationUrl: "https://developer.silverfin.com/docs/unreconciled",
      },
      {
        tagName: "result",
        documentationUrl: "https://developer.silverfin.com/docs/result",
      },
      {
        tagName: "assign",
        documentationUrl:
          "https://developer.silverfin.com/docs/variables#assign",
      },
      {
        tagName: "capture",
        documentationUrl:
          "https://developer.silverfin.com/docs/variables#capture",
      },
    ];

    for (const tag of tags) {
      this.knownTags.set(tag.tagName, tag);
      this.logger.debug(
        `Registered tag: ${tag.tagName} -> ${tag.documentationUrl}`,
      );
    }

    this.logger.debug(`Initialized ${this.knownTags.size} known tags`);
  }

  /**
   * Get documentation for a specific tag
   * @param tagName The name of the tag to look up
   * @returns TagDocumentationEntry if found, null otherwise
   */
  getTagDocumentation(tagName: string): TagDocumentationEntry | null {
    const documentation = this.knownTags.get(tagName);
    this.logger.debug(
      `Tag documentation lookup for "${tagName}": ${documentation ? "found" : "not found"}`,
    );
    return documentation || null;
  }

  /**
   * Check if a tag has documentation available
   * @param tagName The name of the tag to check
   * @returns true if documentation is available, false otherwise
   */
  hasDocumentation(tagName: string): boolean {
    return this.knownTags.has(tagName);
  }

  /**
   * Get all known tags
   * @returns Array of all registered tag names
   */
  getKnownTags(): string[] {
    return Array.from(this.knownTags.keys());
  }

  /**
   * Format hover content for a tag
   * @param tagName The name of the tag
   * @param documentationUrl The documentation URL
   * @returns Formatted hover content in Markdown
   */
  formatTagHover(tagName: string, documentationUrl: string): string {
    return `**Tag:** \`${tagName}\`\n\n**Documentation:** [${documentationUrl}](${documentationUrl})`;
  }

  /**
   * Get formatted hover content for a tag
   * @param tagName The name of the tag to get hover content for
   * @returns Formatted hover content if tag is known, null otherwise
   */
  getTagHoverContent(tagName: string): string | null {
    const documentation = this.getTagDocumentation(tagName);
    if (documentation) {
      return this.formatTagHover(
        documentation.tagName,
        documentation.documentationUrl,
      );
    }
    return null;
  }
}
