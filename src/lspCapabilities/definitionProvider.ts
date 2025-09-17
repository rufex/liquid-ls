import { Logger } from "../logger";
import { DefinitionParams, Location } from "vscode-languageserver/node";

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
    const document = fs.readFileSync(filePath, "utf8");

    if (!document) {
      this.logger.error(`Document not found for URI: ${this.textDocumentUri}`);
      return null;
    }

    // Identify liquid tag under cursor. Using LiquidTagIdentifier
    // Identify what we need to look for
    // Search for all definitions in the template files. Using LiquidTagFinder
    // Examples in fixtures/liquid_tag_reference.liquid
    return null;
  }
}
