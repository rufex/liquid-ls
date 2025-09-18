import { TreeSitterLiquidProvider } from "../liquid/treeSitterLiquidProvider";
import * as fs from "fs";
import * as path from "path";

const fixtureFile = path.join(
  __dirname,
  "../../fixtures/liquid_tags_reference.liquid",
);
const liquidContent = fs.readFileSync(fixtureFile, "utf8");

const parser = new TreeSitterLiquidProvider();
const tree = parser.parseTree(liquidContent);

if (!tree) {
  console.error("Failed to parse the Liquid content.");
  process.exit(1);
}

console.log("=== Tree-Sitter Liquid Parse Tree ===");
console.log("File:", fixtureFile);
console.log("Content length:", liquidContent.length);
console.log("\n=== Parse Tree Structure ===\n");
console.log(tree.rootNode.toString());
