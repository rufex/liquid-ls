import * as Parser from "tree-sitter";
import * as LiquidTreeSitter from "tree-sitter-liquid";
import { Logger } from "../logger";
import { IncludeTagInfo } from "../types";

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
   * Check if the cursor position is on a include statement
   * @param text File content
   * @param line Line number (0-based)
   * @param column Column number (0-based)
   * @returns Parser.SyntaxNode if include_statement found, null otherwise
   */
  public isIncludeStatement(
    text: string,
    line: number,
    column: number,
  ): Parser.SyntaxNode | null {
    const tree = this.parser.parse(text);
    if (!tree) {
      return null;
    }
    const node = tree.rootNode.descendantForPosition({ row: line, column });
    let current: Parser.SyntaxNode | null = node;
    while (current) {
      if (current.type === "include_statement") {
        return current;
      }
      current = current.parent;
    }
    return null;
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
      (include_statement
        (string) @include_path
      )
    `;

    const query = new Parser.Query(this.language, queryString);
    const matches = query.matches(tree.rootNode);

    for (const match of matches) {
      for (const capture of match.captures) {
        if (capture.name === "include_path") {
          const includePath = this.extractIncludePath(capture.node);
          const lineNumber = capture.node.startPosition.row; // 0-based line number

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

          includeTags.push({
            type,
            name,
            lineNumber,
          });

          this.logger.debug(
            `Found include tag: "${includePath}" -> type: ${type}, name: ${name} at line ${lineNumber}`,
          );
        }
      }
    }

    // Sort by line number to maintain document order
    return includeTags.sort((a, b) => a.lineNumber - b.lineNumber);
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
