import * as Parser from "tree-sitter";
import * as LiquidTreeSitter from "tree-sitter-liquid";
import { Logger } from "./logger";
import { IncludeTagInfo } from "./types";

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
      this.logger.debug("Node is not a translation call");
      return null;
    }

    this.logger.debug("Node is a translation call");

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

  /**
   * Get include path at a specific position in the document
   * @param tree The parsed tree
   * @param line Line number (0-based)
   * @param character Character position (0-based)
   * @returns Include path string or null if not found
   */
  getIncludePathAtPosition(
    tree: Parser.Tree,
    line: number,
    character: number,
  ): string | null {
    const node = tree.rootNode.descendantForPosition({
      row: line,
      column: character,
    });

    // Look for include statement in the node hierarchy
    let currentNode: Parser.SyntaxNode | null = node;
    while (currentNode) {
      if (currentNode.type === "include_statement") {
        // Find the path string within the include statement
        const pathNode = this.findIncludePathNode(currentNode);
        if (pathNode) {
          return this.extractTranslationKey(pathNode);
        }
      }
      currentNode = currentNode.parent;
    }

    return null;
  }

  /**
   * Find the path node within an include statement
   */
  private findIncludePathNode(
    includeNode: Parser.SyntaxNode,
  ): Parser.SyntaxNode | null {
    // Look for string nodes that contain the include path
    for (const child of includeNode.children) {
      if (child.type === "string") {
        return child;
      }
    }
    return null;
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

  /**
   * Find all include tags in the tree and return their type, name, and line number
   * @param tree The parsed tree
   * @returns Array of include tag information
   */
  findAllIncludeTags(tree: Parser.Tree): IncludeTagInfo[] {
    const includeTags: IncludeTagInfo[] = [];

    // Query for include statements
    const queryString = `
      (include_statement
        (string) @include_path
      )
    `;

    const matches = this.query(queryString, tree);

    for (const match of matches) {
      for (const capture of match.captures) {
        if (capture.name === "include_path") {
          const includePath = this.extractTranslationKey(capture.node);
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
}
