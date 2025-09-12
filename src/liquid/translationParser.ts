import * as Parser from "tree-sitter";
import * as LiquidTreeSitter from "tree-sitter-liquid";
import { Logger } from "../logger";

type TranslationType = "translation_statement" | "translation_expression";

export class TranslationParser {
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
   * Check if the cursor position is on a translation expression
   * @param text File content
   * @param line Line number (0-based)
   * @param column Column number (0-based)
   * @returns Parser.SyntaxNode if translation statement found, null otherwise
   */
  isTranslationExpression(
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
      if (current.type === "translation_expression") {
        return current;
      }
      current = current.parent;
    }

    return null;
  }

  /**
   * Find all translation expressions in the text that match the given translation key
   * @param text File content
   * @param translationKey The translation key to search for
   * @param translationType translation_statement or translation_expression
   * @returns Array of Parser.SyntaxNode representing translation_expression nodes
   */
  findAll(
    text: string,
    translationKey: string,
    translationType: TranslationType,
  ): Parser.SyntaxNode[] {
    const tree = this.parser.parse(text);
    if (!tree) {
      return [];
    }

    const matchingNodes: Parser.SyntaxNode[] = [];

    const queryString = `
      (${translationType})
        key: (string) @translation_key
      )
    `;

    try {
      const query = new Parser.Query(this.language, queryString);
      const matches = query.matches(tree.rootNode);

      for (const match of matches) {
        for (const capture of match.captures) {
          if (capture.name === "translation_key") {
            const captureKey = this.extractTranslationKey(capture.node);
            if (captureKey === translationKey) {
              // Find the parent translation_expression node
              let parent = capture.node.parent;
              while (parent && parent.type !== translationType) {
                parent = parent.parent;
              }
              if (parent) {
                matchingNodes.push(parent);
              }
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error querying for translation expressions: ${error}`);
    }

    return matchingNodes;
  }

  /**
   * Extract the translation information from a string node
   * @param node The translation_statement node
   * @returns The extracted translation information formatted as a string
   *
   * @example translation {% t= 'key' default:'Text' nl:'Tekst' fr:'Texte' %}
   *
   * This should return:
   * Translation: key
   *
   * default: Text
   * nl: Tekst
   * fr: Texte
   */
  public extractInfo(node: Parser.SyntaxNode): string {
    if (node.type !== "translation_statement") {
      return "";
    }

    const result: string[] = [];

    // Extract the translation key
    const keyNode = node.childForFieldName("key");
    if (keyNode && keyNode.type === "string") {
      const key = this.extractTranslationKey(keyNode);
      result.push(`Translation: ${key}`);
      result.push(""); // Empty line
    }

    // Find all locale declarations (default, nl, fr, etc.)
    const localeDeclarations = node.children.filter(
      (child) => child.type === "locale_declaration",
    );

    for (const declaration of localeDeclarations) {
      const keyNode = declaration.childForFieldName("key");
      const valueNode = declaration.childForFieldName("value");

      if (keyNode && valueNode?.type === "string") {
        const localeKey = keyNode.text;
        const localeValue = this.extractTranslationKey(valueNode);

        result.push(`${localeKey}: ${localeValue}`);
      }
    }

    return result.join("\n");
  }

  private extractTranslationKey(stringNode: Parser.SyntaxNode): string {
    const text = stringNode.text;
    return text.replace(/^['"]|['"]$/g, "");
  }
}
