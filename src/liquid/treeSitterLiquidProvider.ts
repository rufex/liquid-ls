import * as Parser from "tree-sitter";
import * as LiquidTreeSitter from "tree-sitter-liquid";
import { Logger } from "../logger";

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

  private query(queryString: string, tree: Parser.Tree): Parser.QueryMatch[] {
    if (!this.isInitialized || !tree) {
      return [];
    }
    const query = new Parser.Query(this.language, queryString);
    return query.matches(tree.rootNode);
  }

  private findNodes(tree: Parser.Tree, nodeType: string): Parser.SyntaxNode[] {
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

  // Variable assignment and reference methods

  /**
   * Find all variable definitions (assignments and captures) in the tree
   */
  findVariableDefinitions(tree: Parser.Tree): Parser.QueryMatch[] {
    const queryString = `
      [
        (assignment_statement
          variable_name: (identifier) @variable_name
        )
        (capture_statement
          variable: (identifier) @variable_name
        )
        (for_loop_statement
          item: (identifier) @variable_name
        )
      ]
    `;
    return this.query(queryString, tree);
  }

  /**
   * Find variable references (standalone identifiers)
   */
  findVariableReferences(tree: Parser.Tree): Parser.SyntaxNode[] {
    const identifiers = this.findNodes(tree, "identifier");
    // Filter for identifiers that are standalone (direct children of program or block)
    // or part of filter expressions (variable references in filters)
    return identifiers.filter((node) => {
      const parent = node.parent;
      return (
        parent?.type === "program" ||
        parent?.type === "block" ||
        (parent?.type === "filter" && parent.childForFieldName("body") === node)
      );
    });
  }

  /**
   * Get variable name at a specific position
   */
  getVariableAtPosition(
    tree: Parser.Tree,
    row: number,
    column: number,
  ): string | null {
    const node = tree.rootNode.descendantForPosition({ row, column });

    // Check if we're on an identifier that could be a variable reference
    if (node.type === "identifier") {
      const parent = node.parent;
      // Variable reference contexts:
      // 1. Standalone identifier ({{ variable }})
      // 2. Identifier in filter body (variable | filter)
      // 3. Identifier in assignment value (assign x = variable)
      // 4. Identifier as for loop iterator (for i in variable)
      // 5. Bracket notation in assignment (assign [variable] = value)
      if (
        parent?.type === "program" ||
        parent?.type === "block" ||
        (parent?.type === "filter" &&
          parent.childForFieldName("body") === node) ||
        (parent?.type === "assignment_statement" &&
          parent.childForFieldName("value") === node) ||
        (parent?.type === "for_loop_statement" &&
          parent.childForFieldName("iterator") === node) ||
        (parent?.type === "assignment_statement" &&
          parent.childForFieldName("variable_name") === node &&
          this.isBracketNotation(node.text))
      ) {
        // For bracket notation, extract the variable name from [variable]
        if (this.isBracketNotation(node.text)) {
          return this.extractVariableFromBracketNotation(node.text);
        }
        return node.text;
      }
    }

    return null;
  }

  /**
   * Check if a string represents bracket notation like [variable]
   */
  private isBracketNotation(text: string): boolean {
    return text.startsWith("[") && text.endsWith("]") && text.length > 2;
  }

  /**
   * Extract variable name from bracket notation [variable] -> variable
   */
  private extractVariableFromBracketNotation(text: string): string {
    return text.slice(1, -1); // Remove [ and ]
  }

  /**
   * Find variable definition by name
   */
  findVariableDefinitionByName(
    tree: Parser.Tree,
    variableName: string,
  ): Parser.SyntaxNode | null {
    const definitions = this.findVariableDefinitions(tree);

    for (const match of definitions) {
      for (const capture of match.captures) {
        if (
          capture.name === "variable_name" &&
          capture.node.text === variableName
        ) {
          // Return the parent statement node
          let parent = capture.node.parent;
          while (
            parent &&
            parent.type !== "assignment_statement" &&
            parent.type !== "capture_statement" &&
            parent.type !== "for_loop_statement"
          ) {
            parent = parent.parent;
          }
          return parent;
        }
      }
    }

    return null;
  }

  /**
   * Get the precise location of the variable name within a definition
   */
  getVariableNameLocation(
    definitionNode: Parser.SyntaxNode,
  ): Parser.SyntaxNode | null {
    // For assignment_statement, look for variable_name field
    if (definitionNode.type === "assignment_statement") {
      return definitionNode.childForFieldName("variable_name");
    }

    // For capture_statement, look for variable field
    if (definitionNode.type === "capture_statement") {
      return definitionNode.childForFieldName("variable");
    }

    // For for_loop_statement, look for item field
    if (definitionNode.type === "for_loop_statement") {
      return definitionNode.childForFieldName("item");
    }

    return null;
  }

  // Tag documentation methods

  /**
   * Get tag identifier at a specific position
   * @param tree The parsed tree
   * @param row Line number (0-based)
   * @param column Character position (0-based)
   * @returns Tag identifier string or null if not found
   */
  getTagIdentifierAtPosition(
    tree: Parser.Tree,
    row: number,
    column: number,
  ): string | null {
    const node = tree.rootNode.descendantForPosition({ row, column });
    this.logger.debug(
      `Node at position ${row}:${column} - type: ${node.type}, text: "${node.text}"`,
    );

    // Check if the current node itself is a custom_keyword (tag identifier)
    if (node.type === "custom_keyword") {
      const tagName = node.text;
      this.logger.debug(`Found custom_keyword tag identifier: "${tagName}"`);

      // Check if cursor is positioned on this node
      if (this.isPositionOnNode(node, row, column)) {
        this.logger.debug(`Cursor is on tag identifier: "${tagName}"`);
        return tagName;
      }
    }

    // Also check other liquid statement types that might have tag identifiers
    if (node.type === "assign" && this.isPositionOnNode(node, row, column)) {
      this.logger.debug("Found assign tag identifier");
      return "assign";
    }

    if (node.type === "capture" && this.isPositionOnNode(node, row, column)) {
      this.logger.debug("Found capture tag identifier");
      return "capture";
    }

    // Check if we're inside a custom_unpaired_statement
    if (!this.isCustomLiquidStatement(node)) {
      this.logger.debug("Node is not inside a liquid statement");
      return null;
    }

    this.logger.debug("Node is inside a liquid statement");

    // Find the statement parent node
    let statementNode: Parser.SyntaxNode | null = node;
    while (statementNode && !this.isStatementNode(statementNode)) {
      statementNode = statementNode.parent;
    }

    if (!statementNode) return null;

    // Find the tag identifier within the statement
    const tagIdentifier = this.findTagIdentifierInStatement(statementNode);
    if (tagIdentifier) {
      const tagName = tagIdentifier.text;
      this.logger.debug(`Found tag identifier in statement: "${tagName}"`);

      // Check if cursor is positioned on the tag identifier
      if (this.isPositionOnNode(tagIdentifier, row, column)) {
        this.logger.debug(`Cursor is on tag identifier: "${tagName}"`);
        return tagName;
      }
    }

    return null;
  }

  /**
   * Check if a node is inside a custom liquid statement
   */
  private isCustomLiquidStatement(node: Parser.SyntaxNode): boolean {
    let current: Parser.SyntaxNode | null = node;
    while (current) {
      if (this.isStatementNode(current)) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  /**
   * Check if a node is a liquid statement node
   */
  private isStatementNode(node: Parser.SyntaxNode): boolean {
    return (
      node.type === "custom_unpaired_statement" ||
      node.type === "assignment_statement" ||
      node.type === "capture_statement" ||
      node.type === "translation_statement" ||
      node.type === "translation_expression"
      // NOTE: "include_statement" may be treated differently
    );
  }

  /**
   * Find the tag identifier within a liquid statement node
   */
  private findTagIdentifierInStatement(
    statementNode: Parser.SyntaxNode,
  ): Parser.SyntaxNode | null {
    // For custom_unpaired_statement, look for custom_keyword
    // This are Silverfin custom tags like {% unreconciled %}, {% result %}, etc.
    // That are not included yet in the tree-sitter-liquid grammar
    if (statementNode.type === "custom_unpaired_statement") {
      for (const child of statementNode.children) {
        if (child.type === "custom_keyword") {
          return child;
        }
      }
    }

    // Identify tag identifiers for known statements
    // NOTE: is this a redudant check?
    const pairs = [
      { assignment_statement: "assign" },
      { capture_statement: "capture" },
    ];

    for (const pair of pairs) {
      const [nodeType, tagName] = Object.entries(pair)[0];
      if (statementNode.type === nodeType) {
        for (const child of statementNode.children) {
          if (child.type === tagName) {
            return child;
          }
        }
      }
    }

    return null;
  }

  /**
   * Check if a position is on a specific node
   */
  private isPositionOnNode(
    node: Parser.SyntaxNode,
    row: number,
    column: number,
  ): boolean {
    const startPos = node.startPosition;
    const endPos = node.endPosition;

    return (
      (row > startPos.row ||
        (row === startPos.row && column >= startPos.column)) &&
      (row < endPos.row || (row === endPos.row && column <= endPos.column))
    );
  }
}
