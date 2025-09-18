import { Logger } from "../logger";
import { DefinitionParams, Location } from "vscode-languageserver/node";
import { LiquidTagIdentifier } from "../liquid/liquidTagIdentifier";
import { LiquidTagFinder } from "../liquid/liquidTagFinder";
import { URI } from "vscode-uri";
import * as fs from "fs";
import { IncludeParser } from "../liquid/includeParser";
import { parseTemplateUri } from "../utils/templateUriParser";
import { TemplateDirectories } from "../templates/types";
import * as Parser from "tree-sitter";

export class DefinitionProvider {
  private workspaceRoot: string | null;
  private textDocumentUri: DefinitionParams["textDocument"]["uri"];
  private position: DefinitionParams["position"];
  private logger: Logger;

  constructor(params: DefinitionParams, workspaceRoot: string | null) {
    this.workspaceRoot = workspaceRoot || null;
    this.textDocumentUri = params.textDocument.uri;
    this.position = params.position;
    this.logger = new Logger("DefinitionProvider");
  }

  public async handleDefinitionRequest(): Promise<Location[] | null> {
    const filePath = URI.parse(this.textDocumentUri).fsPath;
    const fileContent = fs.readFileSync(filePath, "utf8");

    if (!fileContent) {
      this.logger.error(`Document not found for URI: ${this.textDocumentUri}`);
      return null;
    }

    // Identify liquid tag under cursor. Using LiquidTagIdentifier
    // Identify what we need to look for
    // Search for all definitions in the template files. Using LiquidTagFinder
    // Examples in fixtures/liquid_tag_reference.liquid

    const identifier = new LiquidTagIdentifier();
    const liquidNode = identifier.identifyNode(
      fileContent,
      this.position.line,
      this.position.character,
    );
    if (!liquidNode) {
      this.logger.debug("No Liquid node identified at cursor position");
      return null;
    }

    // INCLUDE TAG
    if (liquidNode.type === "include_statement") {
      return this.handleIncludeTag(liquidNode);
    }

    // TRANSLATION TAG
    if (liquidNode.type === "translation_expression") {
      return this.handleTranslationTag(liquidNode);
    }

    this.logger.debug(
      `No definition handler for node type: ${liquidNode.type}`,
    );
    return null;
  }

  /**
   * Handles the definition lookup for include tags.
   * Either shared parts or text parts.
   * @param liquidNode The syntax node representing the include tag.
   * @returns An array of Locations pointing to the definition, or null if not found.
   */
  private handleIncludeTag(liquidNode: Parser.SyntaxNode): Location[] | null {
    const includeParser = new IncludeParser();
    const includeTag = includeParser.identifyIncludeTag(liquidNode);
    const templateInfo = parseTemplateUri(this.textDocumentUri);
    if (includeTag && this.workspaceRoot && templateInfo) {
      let partPath;
      if (includeTag.type === "sharedPart") {
        partPath = `${this.workspaceRoot}/shared_parts/${includeTag.name}/${includeTag.name}.liquid`;
      } else if (includeTag.type === "textPart") {
        const templateDir = TemplateDirectories[templateInfo.templateType];
        partPath = `${this.workspaceRoot}/${templateDir}/${templateInfo.templateName}/text_parts/${includeTag.name}.liquid`;
      }
      if (partPath && fs.existsSync(partPath)) {
        this.logger.debug(`Found file for include tag: ${partPath}`);
        return [
          {
            uri: URI.file(partPath).toString(),
            range: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 0 },
            },
          },
        ];
      }
      this.logger.debug(`File not found for include tag: ${partPath}`);
    }

    this.logger.warn("No definition found for include tag");
    return null;
  }

  private async handleTranslationTag(
    liquidNode: Parser.SyntaxNode,
  ): Promise<Location[] | null> {
    const searchFor = "translation_statement";
    const identifier = new LiquidTagIdentifier();
    const nodeKey = identifier.identifyNodeKey(liquidNode);
    if (nodeKey && this.workspaceRoot) {
      const finder = new LiquidTagFinder();
      const nodes = await finder.findAllNodesBeforePosition(
        this.textDocumentUri,
        this.position.line,
        nodeKey,
        [searchFor],
        this.workspaceRoot,
      );
      if (!nodes) {
        this.logger.debug(`No translation nodes found for key: ${nodeKey}`);
        return null;
      }

      // return all nodes
      const locations: Location[] = nodes.map((node) => {
        return {
          uri: URI.file(node.templatePart.fileFullPath).toString(),
          range: {
            start: {
              line: node.node.startPosition.row,
              character: node.node.startPosition.column,
            },
            end: {
              line: node.node.endPosition.row,
              character: node.node.endPosition.column,
            },
          },
        };
      });
      this.logger.debug(
        `Found ${locations.length} definitions for translation tag`,
      );
      return locations;
    }

    this.logger.warn("No definition found for translation tag");
    return null;
  }
}
