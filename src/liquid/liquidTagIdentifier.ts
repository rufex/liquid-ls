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
   * Checks if the given liquidNode represents a variable reference.
   * Variables can appear in multiple contexts:
   * - {{ var }} - output statement (identifier directly in program)
   * - {% assign var_name = var %} - value field of assignment_statement
   * - {% for item in items %} - iterator field of for_loop_statement
   * - {% if var %} - condition field of if_statement
   * - {% unless var %} - condition field of unless_statement
   *
   * We exclude variable definitions (the left-hand side):
   * - {% assign var_name = ... %} - variable_name field
   * - {% capture var_capture %} - variable field
   * - {% for item in ... %} - item field
   */
  public identifyVariable(
    text: string,
    line: number,
    column: number,
  ): Parser.SyntaxNode | null {
    const liquidNode = this.isIdentifier(text, line, column);
    if (!liquidNode) {
      this.logger.debug("No identifier node found at position");
      return null;
    }

    const isVar = this.isVariable(liquidNode);
    this.logger.info(`Identifier is variable: ${isVar}`);

    return isVar ? liquidNode : null;
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

  /**
   * Identifies if there's an identifier node at the specified position.
   * Returns the identifier node if found, null otherwise.
   *
   * @param text - The source text to analyze
   * @param line - Zero-based line number of the position to check
   * @param column - Zero-based column number of the position to check
   * @returns The identifier SyntaxNode if found, or null
   */
  private isIdentifier(
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

      // Traverse up to find an identifier node
      while (currentNode) {
        if (currentNode.type === "identifier") {
          this.logger.info(`Found identifier node: ${currentNode.text}`);
          return currentNode;
        }
        currentNode = currentNode.parent;
      }

      this.logger.info("No identifier node found");
      return null;
    } catch (error) {
      this.logger.error(`Failed to identify identifier: ${error}`);
      return null;
    }
  }

  private isVariable(liquidNode: Parser.SyntaxNode): boolean {
    this.logger.debug(
      `Checking if node is variable reference: type=${liquidNode.type}, text=${liquidNode.text}`,
    );

    // Must be an identifier
    if (liquidNode.type !== "identifier") {
      return false;
    }

    const parent = liquidNode.parent;
    if (!parent) {
      return false;
    }

    // Find the field name of this identifier in its parent
    let fieldName: string | null = null;
    for (let i = 0; i < parent.childCount; i++) {
      if (parent.child(i) === liquidNode) {
        fieldName = parent.fieldNameForChild(i);
        break;
      }
    }
    this.logger.debug(
      `Identifier found in parent type: ${parent.type}, field: ${fieldName}`,
    );

    // Check if it's a variable reference based on parent type and field name
    switch (parent.type) {
      case "program":
        // {{ var }} - direct identifier in program (output statement)
        return true;

      case "assignment_statement":
        // {% assign var_name = var %}
        // Only the 'value' field is a variable reference, not 'variable_name'
        // var_name -> variable_name
        // var -> value
        return fieldName === "value";

      case "capture_statement":
        // {% capture var_capture %}
        // The 'variable' field is a definition, not a reference
        // var_capture -> variable
        return false;

      case "for_loop_statement":
        // {% for item in items %}
        // 'iterator' field is a reference, 'item' field is a definition
        // item -> identifier
        // items -> iterator
        return fieldName === "iterator";

      case "if_statement":
      case "unless_statement":
        // {% if var %} or {% unless var %}
        // The 'condition' field is a variable reference
        // var -> condition: (identifier)
        return fieldName === "condition";

      case "elsif_clause":
        // {% elsif var %}
        // The 'condition' field is a variable reference
        return fieldName === "condition";

      case "push_statement":
      case "pop_statement":
        // {% push item_var to:array_var %} or {% pop item_var to:array_var %}
        // array_var -> array
        // item_var -> item
        return fieldName === "array" || fieldName === "item";

      case "filter":
        // {{ var | filter_name }} or {% assign x = var | filter_name %}
        // The 'body' field is a variable reference
        // var -> body
        return fieldName === "body";

      case "argument_list":
        // {{ var | filter_name:arg_var }} or {% assign x = var | filter_name:arg_var %}
        // Identifiers in argument_list are variable references
        // arg_var -> (identifier) in argument_list
        return true;

      default:
        // For other contexts, we might want to expand this in the future
        // For now, return false for unknown contexts
        return false;
    }
  }
}
