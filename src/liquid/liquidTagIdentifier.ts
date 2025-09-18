import { Logger } from "../logger";
import * as Parser from "tree-sitter";
import { TreeSitterLiquidProvider } from "./treeSitterLiquidProvider";
import {
  LiquidNodeType,
  LiquidNodeTypes,
  LiquidNodeTagNames,
  LiquidTagName,
} from "./types";

/**
 * Identifies Liquid template language nodes in a given text using Tree-sitter parsing.
 * Used to determine the type of Liquid tag or expression at a specific position in the text.
 */
export class LiquidTagIdentifier {
  private logger = new Logger("LiquidTagIdentifier");
  private parser = new TreeSitterLiquidProvider();

  constructor() {}

  /**
   * Identifies the Liquid node type at a specific position in the text.
   * Traverses up the syntax tree from the given position until it finds a valid Liquid node.
   *
   * @param text - The source text to analyze
   * @param line - Zero-based line number of the position to check
   * @param column - Zero-based column number of the position to check
   * @returns The type of the Liquid node found, or null if no valid node is found
   */
  public identifyNode(
    text: string,
    line: number,
    column: number,
  ): Parser.SyntaxNode | null {
    try {
      const tree = this.parser.parseTree(text);
      if (!tree) {
        this.logger.warn("Failed to parse text");
        return null;
      }

      const node = tree.rootNode.descendantForPosition({ row: line, column });
      let currentNode: Parser.SyntaxNode | null = node;

      while (currentNode) {
        if (this.isValidNodeType(currentNode.type)) {
          this.logger.info(`Found valid Liquid node: ${currentNode}`);
          return currentNode;
        }
        currentNode = currentNode.parent;
      }

      this.logger.info("No valid Liquid node type found");
      return null;
    } catch (error) {
      this.logger.error(`Failed to identify node: ${error}`);
      return null;
    }
  }

  /**
   * Identifies the Liquid tag name at a specific position in the text.
   * Returns the tag name if the cursor is positioned on a tag identifier.
   *
   * @param text - The source text to analyze
   * @param line - Zero-based line number of the position to check
   * @param column - Zero-based column number of the position to check
   * @returns The tag name if found, or null otherwise
   */
  public identifyTagName(liquidNode: Parser.SyntaxNode): LiquidTagName | null {
    return this.extractTagNameFromNode(liquidNode);
  }

  private extractTagNameFromNode(
    liquidNode: Parser.SyntaxNode,
  ): LiquidTagName | null {
    if (
      liquidNode.type in LiquidNodeTagNames &&
      this.isTagNameType(liquidNode.type)
    ) {
      const tagName = LiquidNodeTagNames[liquidNode.type];
      this.logger.info(`Extracted tag name: ${tagName}`);

      return tagName;
    }

    // Handle custom unpaired statements (like Silverfin custom tags)
    // These are not handled yet by tree-sitter-liquid
    if (liquidNode.type === "custom_unpaired_statement") {
      for (const child of liquidNode.children) {
        if (child.type === "custom_keyword") {
          const tagName = child.text.trim() as LiquidTagName;
          this.logger.info(`Extracted custom tag name: ${tagName}`);

          return tagName;
        }
      }
    }

    return null;
  }

  /**
   * Extracts the key from a Liquid node, if present.
   * Looks for a child node with the field name "key" and returns its text content.
   *
   * @param liquidNode - The Liquid syntax node to extract the key from
   * @returns The extracted key as a string, or null if not found
   */
  public identifyNodeKey(liquidNode: Parser.SyntaxNode): string | null {
    const keyNode = liquidNode.childForFieldName("key");
    if (keyNode && keyNode.type === "string") {
      const text = keyNode.text;
      return text.replace(/^['"]|['"]$/g, "");
    }
    this.logger.warn("Key not found in liquidNode");
    return null;
  }

  private isValidNodeType(type: string): type is LiquidNodeType {
    return Object.values(LiquidNodeTypes).includes(type as LiquidNodeType);
  }

  private isTagNameType(type: string): type is keyof typeof LiquidNodeTagNames {
    return type in LiquidNodeTagNames;
  }
}
