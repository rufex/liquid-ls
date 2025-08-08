import * as Parser from "tree-sitter";
import * as LiquidTreeSitter from "tree-sitter-liquid";

export class TreeSitterLiquidProvider {
  private parser: Parser;
  private language: Parser.Language;
  private isInitialized = false;

  constructor() {
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
}
