import { Logger } from "../logger";
import * as Parser from "tree-sitter";
import { TreeSitterLiquidProvider } from "./treeSitterLiquidProvider";
import * as fs from "fs";
import { TemplatePartsCollectionManager } from "../templates/templatePartsCollectionManager";

export class LiquidTagFinder {
  private logger = new Logger("LiquidTagFinder");
  private parser = new TreeSitterLiquidProvider();

  constructor() {}

  public async findAllNodesBeforePosition(
    textDocumentUri: string,
    currentRow: number,
    liquidKey: string,
    liquidType: string,
    workspaceRoot: string,
  ): Promise<Parser.SyntaxNode[] | null> {
    const templateManager =
      TemplatePartsCollectionManager.getInstance(workspaceRoot);
    const templateDetails = await templateManager.getMapAndIndexFromUri(
      textDocumentUri,
      currentRow,
    );

    if (!templateDetails) {
      this.logger.warn(`No template parts found for URI: ${textDocumentUri}`);
      return null;
    }
    const { templateParts, currentFileIndex } = templateDetails;

    if (!templateParts || currentFileIndex === -1) {
      this.logger.warn(`No template parts found for URI: ${textDocumentUri}`);
      return null;
    }

    const matchingNodes: Parser.SyntaxNode[] = [];

    for (let i = 0; i <= currentFileIndex; i++) {
      const part = templateParts[i];

      try {
        const fileContent = fs.readFileSync(part.fileFullPath, "utf8");
        const nodes = this.findNodesInText(fileContent, liquidKey, liquidType);

        if (i === currentFileIndex) {
          for (const node of nodes) {
            if (node.startPosition.row < currentRow) {
              matchingNodes.push(node);
            }
          }
        } else {
          matchingNodes.push(...nodes);
        }
      } catch (error) {
        this.logger.warn(`Could not read file: ${part.fileFullPath}, ${error}`);
      }
    }

    return matchingNodes;
  }

  private findNodesInText(
    text: string,
    liquidKey: string,
    liquidType: string,
  ): Parser.SyntaxNode[] {
    const tree = this.parser.parseTree(text);
    if (!tree) {
      return [];
    }

    const matchingNodes: Parser.SyntaxNode[] = [];

    const queryString = `
      (${liquidType}
        key: (string) @key
      )
    `;

    try {
      const matches = this.parser.queryTree(queryString, tree);

      for (const match of matches) {
        for (const capture of match.captures) {
          if (capture.name === "key") {
            const captureKey = this.extractKey(capture.node);
            if (captureKey === liquidKey) {
              let parent = capture.node.parent;
              while (parent && parent.type !== liquidType) {
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
      this.logger.error(`Error querying for ${liquidType}: ${error}`);
    }

    return matchingNodes;
  }

  private extractKey(stringNode: Parser.SyntaxNode): string {
    const text = stringNode.text;
    return text.replace(/^['"]|['"]$/g, "");
  }
}
