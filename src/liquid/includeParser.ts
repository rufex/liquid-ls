import * as Parser from "tree-sitter";
import * as LiquidTreeSitter from "tree-sitter-liquid";
import { Logger } from "../logger";
import { IncludeTagInfo } from "../liquid/types";

export class IncludeParser {
  private parser: Parser;
  private language: Parser.Language;
  private logger: Logger;

  constructor() {
    this.logger = new Logger("TranslationParser");
    try {
      this.parser = new Parser();
      this.language = LiquidTreeSitter as Parser.Language;
      this.parser.setLanguage(this.language);
    } catch (error) {
      this.logger.error(`Failed to initialize TranslationParser: ${error}`);
      throw error;
    }
  }

  /**
   * Find all include tags in the tree and return their type, name, and line number
   * @param text File content
   * @returns Array of include tag information
   */
  public findAll(text: string): IncludeTagInfo[] {
    const tree = this.parser.parse(text);
    if (!tree) {
      return [];
    }

    const includeTags: IncludeTagInfo[] = [];

    const queryString = `
      (include_statement) @include_statement
    `;

    const query = new Parser.Query(this.language, queryString);
    const matches = query.matches(tree.rootNode);

    for (const match of matches) {
      for (const capture of match.captures) {
        if (capture.name === "include_statement") {
          const includeTag = this.identifyIncludeTag(capture.node);
          if (includeTag) {
            includeTags.push(includeTag);
          }
        }
      }
    }

    // Sort by line number to maintain document order
    return includeTags.sort((a, b) => a.lineNumber - b.lineNumber);
  }

  /**
   * Identify include tag information from a syntax node
   * @param includeNode The include_statement syntax node
   * @returns IncludeTagInfo object or null if not a valid include node
   */
  public identifyIncludeTag(
    includeNode: Parser.SyntaxNode,
  ): IncludeTagInfo | null {
    if (includeNode.type !== "include_statement") {
      return null;
    }

    // Find the string node within the include statement
    const stringNode = includeNode.children.find(
      (child) => child.type === "string",
    );
    if (!stringNode) {
      return null;
    }

    const includePath = this.extractIncludePath(stringNode);
    const lineNumber = stringNode.startPosition.row; // 0-based line number

    // Determine the type and name based on the include path
    let type: "textPart" | "sharedPart";
    let name: string;

    if (includePath.startsWith("shared/")) {
      type = "sharedPart";
      name = includePath.substring(7); // Remove "shared/" prefix
    } else if (includePath.startsWith("parts/")) {
      type = "textPart";
      name = includePath.substring(6); // Remove "parts/" prefix
    } else {
      // Default to textPart for other formats
      type = "textPart";
      name = includePath;
    }

    this.logger.debug(
      `Identified include tag: "${includePath}" -> type: ${type}, name: ${name} at line ${lineNumber}`,
    );

    return {
      type,
      name,
      lineNumber,
    };
  }

  /**
   * Extract include path from a string node by removing quotes
   * @param stringNode The string node containing the include path
   * @returns The include path without quotes
   */
  private extractIncludePath(stringNode: Parser.SyntaxNode): string {
    const text = stringNode.text;
    // Remove quotes from the string
    return text.replace(/^['"]|['"]$/g, "");
  }
}
