import { Logger } from "../logger";
import { DefinitionParams, Location } from "vscode-languageserver/node";

export class DefinitionProvider {
  private params: DefinitionParams;
  private logger: Logger;

  constructor(params: DefinitionParams) {
    this.params = params;
    this.logger = new Logger("DefinitionProvider");
  }

  public async handleDefinitionRequest(): Promise<Location[] | null> {
    // TODO: List of things to handle:
    // Identify type of request. At the moment: Variable, Translation, Include
    // Do we need independent or shared providers for each type?
    // Get the templatePartsMap of the current file
    // If its an include, just resolve the path and return the first line of that file
    // Other searchs, we first need to find all the possible locations using the templatePartsMap
    // Find all occurrences of the variable/translation in those files
    // Return the most relevant one (this is, the inmediate before to the current position)
  }
}
