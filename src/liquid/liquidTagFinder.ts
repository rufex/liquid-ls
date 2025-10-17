import { Logger } from "../logger";
import * as Parser from "tree-sitter";
import { TreeSitterLiquidProvider } from "./treeSitterLiquidProvider";
import * as fs from "fs";
import { TemplatePartsCollectionManager } from "../templates/templatePartsCollectionManager";

interface NodeInTemplate {
  node: Parser.SyntaxNode;
  templatePart: { fileFullPath: string };
}

export class LiquidTagFinder {
  private logger = new Logger("LiquidTagFinder");
  private parser = new TreeSitterLiquidProvider();

  constructor() {}

  public async findAllNodesBeforePosition(
    textDocumentUri: string,
    currentRow: number,
    liquidKey: string,
    liquidTypes: string[],
    workspaceRoot: string,
  ): Promise<NodeInTemplate[] | null> {
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

    this.logger.info("Parts identified: " + templateParts.length);

    const matchingNodes: NodeInTemplate[] = [];

    for (let i = 0; i <= currentFileIndex; i++) {
      const part = templateParts[i];

      try {
        const fileContent = fs.readFileSync(part.fileFullPath, "utf8");
        const nodes = this.findNodesInText(fileContent, liquidKey, liquidTypes);

        // Filter nodes that are within this part's line range
        const nodesInRange = nodes.filter(
          (node) =>
            node.startPosition.row >= part.startLine &&
            node.endPosition.row <= part.endLine,
        );

        if (i === currentFileIndex) {
          for (const node of nodesInRange) {
            if (node.startPosition.row < currentRow) {
              matchingNodes.push({ node, templatePart: part });
            }
          }
        } else {
          nodesInRange.forEach((node) =>
            matchingNodes.push({ node, templatePart: part }),
          );
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
    liquidTypes: string[],
  ): Parser.SyntaxNode[] {
    const tree = this.parser.parseTree(text);
    if (!tree) {
      return [];
    }

    const keyKey = "key";
    const matchingNodes: Parser.SyntaxNode[] = [];

    try {
      for (const liquidType of liquidTypes) {
        // Example query:
        // (translation_statement
        //  key: (string) @key
        //  )
        //  (assignment_statement
        //  variable_name: (string) @key
        //  )
        const queryString = `(${liquidType}
          ${keyKey}: (string) @${keyKey}
        )`;

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
      }
    } catch (error) {
      this.logger.error(
        `Error querying for ${liquidTypes.concat(", ")}: ${error}`,
      );
    }

    return matchingNodes;
  }

  private extractKey(stringNode: Parser.SyntaxNode): string {
    const text = stringNode.text;
    return text.replace(/^['"]|['"]$/g, "");
  }

  public async findAllVariableDefinitionsBeforePosition(
    textDocumentUri: string,
    currentRow: number,
    variableName: string,
    workspaceRoot: string,
  ): Promise<NodeInTemplate[] | null> {
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

    this.logger.info("Parts identified: " + templateParts.length);

    const matchingNodes: NodeInTemplate[] = [];

    for (let i = 0; i <= currentFileIndex; i++) {
      const part = templateParts[i];

      try {
        const fileContent = fs.readFileSync(part.fileFullPath, "utf8");
        const nodes = this.findVariableDefinitionsInText(
          fileContent,
          variableName,
        );

        // Filter nodes that are within this part's line range
        const nodesInRange = nodes.filter(
          (node) =>
            node.startPosition.row >= part.startLine &&
            node.endPosition.row <= part.endLine,
        );

        if (i === currentFileIndex) {
          for (const node of nodesInRange) {
            if (node.startPosition.row < currentRow) {
              matchingNodes.push({ node, templatePart: part });
            }
          }
        } else {
          nodesInRange.forEach((node) =>
            matchingNodes.push({ node, templatePart: part }),
          );
        }
      } catch (error) {
        this.logger.warn(`Could not read file: ${part.fileFullPath}, ${error}`);
      }
    }

    return matchingNodes;
  }

  private findVariableDefinitionsInText(
    text: string,
    variableName: string,
  ): Parser.SyntaxNode[] {
    const tree = this.parser.parseTree(text);
    if (!tree) {
      return [];
    }

    const matchingNodes: Parser.SyntaxNode[] = [];

    // Define the different statement types and their field names
    const statementConfigs = [
      { type: "assignment_statement", field: "variable_name" },
      { type: "capture_statement", field: "variable" },
      { type: "for_loop_statement", field: "item" },
    ];

    try {
      for (const config of statementConfigs) {
        // Query for each statement type with its specific field
        const queryString = `(${config.type}
          ${config.field}: (identifier) @var_name
        )`;

        const matches = this.parser.queryTree(queryString, tree);

        for (const match of matches) {
          for (const capture of match.captures) {
            if (capture.name === "var_name") {
              const capturedName = capture.node.text;
              if (capturedName === variableName) {
                let parent = capture.node.parent;
                while (parent && parent.type !== config.type) {
                  parent = parent.parent;
                }
                if (parent) {
                  matchingNodes.push(parent);
                }
              }
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error querying for variable definitions: ${error}`);
    }

    return matchingNodes;
  }
}
