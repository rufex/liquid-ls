import { TemplatePartsMapper } from "../templates/templatePartsMapper";
import * as path from "path";

const workspaceRoot = path.join(__dirname, "../../fixtures/market-repo");
new TemplatePartsMapper(workspaceRoot).generateTemplateMap(
  "reconciliationText",
  "reconciliation_text_1",
);
