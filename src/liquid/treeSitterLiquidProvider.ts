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

  public parseTree(text: string): Parser.Tree | null {
    if (!this.isInitialized) {
      return null;
    }
    return this.parser.parse(text);
  }

  public queryTree(
    queryString: string,
    tree: Parser.Tree,
  ): Parser.QueryMatch[] {
    if (!this.isInitialized || !tree) {
      return [];
    }
    const query = new Parser.Query(this.language, queryString);

    return query.matches(tree.rootNode);
  }
}
