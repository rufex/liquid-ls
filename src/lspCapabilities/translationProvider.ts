import * as Parser from "tree-sitter";
import { Logger } from "../logger";

export class TranslationProvider {
  private logger: Logger;

  constructor() {
    this.logger = new Logger("TranslationParser");
    try {
    } catch (error) {
      this.logger.error(`Failed to initialize TranslationParser: ${error}`);
      throw error;
    }
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
