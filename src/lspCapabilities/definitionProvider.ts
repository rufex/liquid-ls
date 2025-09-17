import { Logger } from "../logger";
import { DefinitionParams, Location } from "vscode-languageserver/node";
import { TemplatePartsCollectionManager } from "../templates/templatePartsCollectionManager";
import { parseTemplateUri } from "../utils/templateUriParser";
import { TemplateParts, TemplateUriInfo } from "../templates/types";

type TypeRequest = "include" | "variable" | "translation" | "unknown";

export class DefinitionProvider {
  private params: DefinitionParams;
  private logger: Logger;
  private workspaceRoot: string | null;

  constructor(params: DefinitionParams, workspaceRoot: string | null) {
    this.params = params;
    this.workspaceRoot = workspaceRoot;
    this.logger = new Logger("DefinitionProvider");
  }

  public async handleDefinitionRequest(): Promise<Location[] | null> {
    const typeRequest = this.identifyTypeRequest(this.params);
    this.logger.debug(`Type of Definition Request: ${typeRequest}`);

    const templateParts = await this.loadTemplateParts();
    this.logger.debug(
      `Template Parts for Definition Request: ${JSON.stringify(templateParts)}`,
    );
    return null;
    // TODO:
    // Find definition location using template parts
    // For include, simple see the file in the include and return it's location in line 0
    // For variables and translations, identyify all occurrences and return the closest one (that is before the cursor)
  }

  private identifyTypeRequest(params: DefinitionParams): TypeRequest {
    this.logger.debug(
      `Identifying type of request for params: ${JSON.stringify(params)}`,
    );
    return "unknown";
    // TODO: Use tree sitter to identify the type of request
  }

  private async loadTemplateParts(): Promise<TemplateParts | null> {
    if (!this.workspaceRoot) {
      this.logger.warn("No workspace root defined.");
      return null;
    }
    const templateManager = TemplatePartsCollectionManager.getInstance(
      this.workspaceRoot,
    );
    const templateUriInfo: TemplateUriInfo | null = parseTemplateUri(
      this.params.textDocument.uri,
    );
    if (!templateUriInfo) {
      this.logger.warn(
        `Could not parse template URI: ${this.params.textDocument.uri}`,
      );
      return null;
    }

    const templateParts = await templateManager.getMap(
      templateUriInfo.templateType,
      templateUriInfo.templateName,
    );

    if (!templateParts) {
      this.logger.warn(
        `No template parts found for URI: ${this.params.textDocument.uri}`,
      );
      return null;
    }

    return templateParts;
  }
}
