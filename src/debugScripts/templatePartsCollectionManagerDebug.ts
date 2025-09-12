import * as path from "path";
import { TemplatePartsCollectionManager } from "../templates/templatePartsCollectionManager";

const workspaceRoot = path.join(__dirname, "../../fixtures/market-repo");
const mapper = TemplatePartsCollectionManager.getInstance(workspaceRoot);

mapper.loadMap("reconciliationText", "reconciliation_text_1");
mapper.loadMap("reconciliationText", "reconciliation_text_2");
