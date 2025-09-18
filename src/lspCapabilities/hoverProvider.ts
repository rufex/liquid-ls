import { DocumentationProvider } from "./documentationProvider";
import { Logger } from "../logger";
import { HoverParams } from "vscode-languageserver/node";
import { URI } from "vscode-uri";
import * as fs from "fs";
import { TranslationProvider } from "./translationProvider";
import { LiquidTagIdentifier } from "../liquid/liquidTagIdentifier";
import { LiquidTagFinder } from "../liquid/liquidTagFinder";

export class HoverProvider {
  private workspaceRoot: string | null;
  private textDocumentUri: HoverParams["textDocument"]["uri"];
  private position: HoverParams["position"];
  private logger: Logger;
  private documentationProvider: DocumentationProvider;

  constructor(params: HoverParams, workspaceRoot?: string | null) {
    this.workspaceRoot = workspaceRoot || null;
    this.textDocumentUri = params.textDocument.uri;
    this.position = params.position;
    this.logger = new Logger("HoverProvider");
    this.documentationProvider = new DocumentationProvider();

    this.logger.logRequest("HoverProvider initialized", {
      uri: this.textDocumentUri,
      position: this.position,
    });
    this.logger.debug(`Workspace root: ${this.workspaceRoot}`);
  }

  public async handleHoverRequest(): Promise<string | null> {
    const filePath = URI.parse(this.textDocumentUri).fsPath;
    const document = fs.readFileSync(filePath, "utf8");

    if (!document) {
      this.logger.error(`Document not found for URI: ${this.textDocumentUri}`);
      return null;
    }

    // IDENTIFY NODE

    const identifier = new LiquidTagIdentifier();
    const liquidNode = identifier.identifyNode(
      document,
      this.position.line,
      this.position.character,
    );
    if (!liquidNode) {
      this.logger.debug("No Liquid node identified at cursor position");
      return null;
    }

    // TRANSLATIONS

    if (liquidNode.type === "translation_expression") {
      this.logger.debug(`Found translation expression: ${liquidNode}`);

      const translationKey = identifier.identifyNodeKey(liquidNode);
      if (translationKey && this.workspaceRoot) {
        const finder = new LiquidTagFinder();
        const nodes = await finder.findAllNodesBeforePosition(
          this.textDocumentUri,
          this.position.line,
          translationKey,
          ["translation_statement"],
          this.workspaceRoot,
        );
        if (!nodes) {
          this.logger.debug(
            `No translation nodes found for key: ${translationKey}`,
          );
          return null;
        }
        const lastNode = nodes.length > 0 ? nodes[nodes.length - 1] : null;

        if (lastNode) {
          const translationProvider = new TranslationProvider();
          return translationProvider.extractInfo(lastNode.node);
        }
      }
    }

    // DOCUMENTATION

    const tagIdentifier = identifier.identifyTagName(liquidNode);

    if (tagIdentifier) {
      const tagHoverContent =
        this.documentationProvider.getTagHoverContent(tagIdentifier);
      if (tagHoverContent) {
        return tagHoverContent;
      }
    }

    // No hover information available
    this.logger.debug("No hover information available");
    return null;
  }
}
