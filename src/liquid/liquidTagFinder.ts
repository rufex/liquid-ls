import { Logger } from "../logger";
import * as Parser from "tree-sitter";
import { TreeSitterLiquidProvider } from "./treeSitterLiquidProvider";
import { TemplateParts } from "../templates/types";
import * as fs from "fs";
import { TemplatePartsCollectionManager } from "../templates/templatePartsCollectionManager";
import { parseTemplateUri } from "../utils/templateUriParser";

export class LiquidTagFinder {
  private logger = new Logger("LiquidTagFinder");
  private parser = new TreeSitterLiquidProvider();

  constructor() {}

  public async findAllNodesBeforePosition(
    textDocumentUri: string,
    currentFilePath: string,
    currentRow: number,
    liquidKey: string,
    liquidType: string,
    workspaceRoot: string,
  ): Promise<Parser.SyntaxNode[] | null> {
    const templateUriInfo = parseTemplateUri(textDocumentUri);
    if (!templateUriInfo) {
      this.logger.warn(`Could not parse template URI: ${textDocumentUri}`);
      return null;
    }

    const templateManager =
      TemplatePartsCollectionManager.getInstance(workspaceRoot);
    const templateParts = await templateManager.getMap(
      templateUriInfo.templateType,
      templateUriInfo.templateName,
    );

    if (!templateParts) {
      this.logger.warn(`No template parts found for URI: ${textDocumentUri}`);
      return null;
    }

    const currentFileIndex = this.findCurrentFileIndex(
      templateParts,
      currentFilePath,
      currentRow,
    );

    if (currentFileIndex === -1) {
      this.logger.warn(
        `Current file not found in template parts: ${currentFilePath}`,
      );
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

  private findCurrentFileIndex(
    templateParts: TemplateParts,
    currentFilePath: string,
    currentLine: number,
  ): number {
    let lastMatchingIndex = -1;

    for (let i = 0; i < templateParts.length; i++) {
      if (templateParts[i].fileFullPath === currentFilePath) {
        if (
          currentLine >= templateParts[i].startLine &&
          currentLine <= templateParts[i].endLine
        ) {
          return i;
        }
        lastMatchingIndex = i;
      }
    }

    return lastMatchingIndex;
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
