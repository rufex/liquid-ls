import { TreeSitterLiquidProvider } from "../liquid/treeSitterLiquidProvider";
import * as Parser from "tree-sitter";

const code = `{% assign OtherFinanceExpenses_accounts = period_accounts_0y | range:OtherFinanceExpenses_range | map:'mapped_number' %}`;

const parser = new TreeSitterLiquidProvider();
const tree = parser.parseTree(code);

if (!tree) {
  console.log("Failed to parse");
  process.exit(1);
}

console.log("=== Full Tree ===");
console.log(tree.rootNode.toString());

// Find period_accounts_0y (starts at position 42)
const targetPos = { row: 0, column: 42 };
console.log(`\n=== Looking at position ${targetPos.column} (period_accounts_0y) ===`);

const node = tree.rootNode.descendantForPosition(targetPos);
console.log(`Node at position: type="${node.type}", text="${node.text}"`);

let current: Parser.SyntaxNode | null = node;
let depth = 0;
console.log("\n=== Parent chain ===");
while (current) {
  let fieldName = null;
  if (current.parent) {
    for (let i = 0; i < current.parent.childCount; i++) {
      if (current.parent.child(i) === current) {
        fieldName = current.parent.fieldNameForChild(i);
        break;
      }
    }
  }
  
  console.log(`${"  ".repeat(depth)}${current.type} (field: ${fieldName || "none"}, text: "${current.text.substring(0, 30)}${current.text.length > 30 ? "..." : ""}")`);
  current = current.parent;
  depth++;
}
