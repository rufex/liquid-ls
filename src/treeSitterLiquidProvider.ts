import * as Parser from "tree-sitter";
import * as LiquidTreeSitter from "tree-sitter-liquid";
import { Logger } from "./logger";

export class TreeSitterLiquidProvider {
  private parser: Parser;
  private language: Parser.Language;
  private isInitialized = false;
  private logger: Logger;

  constructor() {
    this.logger = new Logger("TreeSitterLiquidProvider");
    try {
      this.parser = new Parser();
      this.language = LiquidTreeSitter as Parser.Language;
      this.parser.setLanguage(this.language);
      this.isInitialized = true;
    } catch (error) {
      throw error;
    }
  }

  parseText(text: string): Parser.Tree | null {
    if (!this.isInitialized) {
      return null;
    }
    return this.parser.parse(text);
  }

  query(queryString: string, tree: Parser.Tree): Parser.QueryMatch[] {
    if (!this.isInitialized || !tree) {
      return [];
    }
    const query = new Parser.Query(this.language, queryString);
    return query.matches(tree.rootNode);
  }

  // Helper method to find specific nodes
  findNodes(tree: Parser.Tree, nodeType: string): Parser.SyntaxNode[] {
    const nodes: Parser.SyntaxNode[] = [];

    function traverse(node: Parser.SyntaxNode) {
      if (node.type === nodeType) {
        nodes.push(node);
      }
      for (const child of node.children) {
        traverse(child);
      }
    }

    traverse(tree.rootNode);
    return nodes;
  }

  // Get syntax tree as string for debugging
  getTreeString(tree: Parser.Tree): string {
    return tree.rootNode.toString();
  }

  // Find translation calls ({% t 'translation_name' %})
  findTranslationCalls(tree: Parser.Tree): Parser.QueryMatch[] {
    const queryString = `
      (translation_expression
        key: (string) @translation_key
      )
    `;
    return this.query(queryString, tree);
  }

  // Find translation definitions ({% t= 'translation_name' default:'Text' %})
  findTranslationDefinitions(tree: Parser.Tree): Parser.QueryMatch[] {
    const queryString = `
      (translation_statement
        key: (string) @translation_key
      )
    `;
    return this.query(queryString, tree);
  }

  // Extract translation key from a string node
  extractTranslationKey(stringNode: Parser.SyntaxNode): string {
    const text = stringNode.text;
    // Remove quotes from the string
    return text.replace(/^['"]|['"]$/g, "");
  }

  // Check if a node is a translation call
  isTranslationCall(node: Parser.SyntaxNode): boolean {
    // Check if we're inside a translation_expression
    let current: Parser.SyntaxNode | null = node;
    while (current && current.type !== "translation_expression") {
      current = current.parent;
    }

    return current !== null;
  }

  // Get translation key from current position
  getTranslationKeyAtPosition(
    tree: Parser.Tree,
    row: number,
    column: number,
  ): string | null {
    const node = tree.rootNode.descendantForPosition({ row, column });
    this.logger.debug(
      `Node at position ${row}:${column} - type: ${node.type}, text: "${node.text}"`,
    );

    // Check if we're on a translation call
    if (!this.isTranslationCall(node)) {
      this.logger.debug(`Node is not a translation call`);
      return null;
    }

    this.logger.debug(`Node is a translation call`);

    // Find the translation_expression node
    let current: Parser.SyntaxNode | null = node;
    while (current && current.type !== "translation_expression") {
      current = current.parent;
    }

    if (!current) return null;

    // Look for the key field
    const keyNode = current.childForFieldName("key");
    this.logger.debug(
      `Key node: ${keyNode ? `type: ${keyNode.type}, text: "${keyNode.text}"` : "null"}`,
    );
    if (keyNode && keyNode.type === "string") {
      const extractedKey = this.extractTranslationKey(keyNode);
      this.logger.debug(`Extracted translation key: "${extractedKey}"`);
      return extractedKey;
    }

    return null;
  }

  // Find translation definition by key
  findTranslationDefinitionByKey(
    tree: Parser.Tree,
    translationKey: string,
  ): Parser.SyntaxNode | null {
    this.logger.debug(
      `Searching for translation definition: "${translationKey}"`,
    );
    const definitions = this.findTranslationDefinitions(tree);
    this.logger.debug(
      `Found ${definitions.length} translation definitions in tree`,
    );

    for (const match of definitions) {
      for (const capture of match.captures) {
        if (capture.name === "translation_key") {
          const captureKey = this.extractTranslationKey(capture.node);
          this.logger.debug(`Found definition key: "${captureKey}"`);
          if (captureKey === translationKey) {
            this.logger.debug(`Match found for key: "${translationKey}"`);
            // Return the parent translation_statement node
            let parent = capture.node.parent;
            while (parent && parent.type !== "translation_statement") {
              parent = parent.parent;
            }
            return parent;
          }
        }
      }
    }

    return null;
  }

  // Extract translation definition content showing all key:value pairs
  extractTranslationDefinitionContent(
    definitionNode: Parser.SyntaxNode,
  ): string {
    // For a translation definition like {% t= 'key' default:'Text' nl:'Tekst' fr:'Texte' %}
    // we want to show all key:value pairs

    const localeDeclarations = definitionNode.children.filter(
      (child) => child.type === "locale_declaration",
    );

    if (localeDeclarations.length === 0) {
      return definitionNode.text;
    }

    const keyValuePairs: string[] = [];

    for (const declaration of localeDeclarations) {
      const keyNode = declaration.childForFieldName("key");
      const valueNode = declaration.childForFieldName("value");

      if (keyNode && valueNode?.type === "string") {
        const key = keyNode.text;
        const value = this.extractTranslationKey(valueNode);
        // Only include non-empty translations
        if (value.trim()) {
          keyValuePairs.push(`${key}: "${value}"`);
        }
      }
    }

    return keyValuePairs.length > 0
      ? keyValuePairs.join("\n")
      : definitionNode.text;
  }

  // Get the precise location of the translation key within a definition
  getTranslationKeyLocation(
    definitionNode: Parser.SyntaxNode,
  ): Parser.SyntaxNode | null {
    // Find the key field in the translation_statement
    const keyNode = definitionNode.childForFieldName("key");
    if (keyNode && keyNode.type === "string") {
      return keyNode;
    }

    // Fallback: look for the first string node
    const stringNodes = definitionNode.children.filter(
      (child) => child.type === "string",
    );

    return stringNodes.length > 0 ? stringNodes[0] : null;
  }
}
