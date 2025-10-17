import { TreeSitterLiquidProvider } from "../liquid/treeSitterLiquidProvider";
import * as Parser from "tree-sitter";

const code = `{% capture my_var %}Content{% endcapture %}
{{ my_var }}`;

const parser = new TreeSitterLiquidProvider();
const tree = parser.parseTree(code);

if (!tree) {
  console.log("Failed to parse");
  process.exit(1);
}

console.log("=== Full Tree ===");
console.log(tree.rootNode.toString());

console.log("\n=== Query for capture_statement ===");
const query = `(capture_statement variable: (identifier) @var_name)`;
const matches = parser.queryTree(query, tree);
console.log(`Found ${matches.length} matches`);

matches.forEach((match, i) => {
  console.log(`\nMatch ${i + 1}:`);
  match.captures.forEach((capture) => {
    console.log(`  Capture: ${capture.name} = "${capture.node.text}"`);
    console.log(`  Position: row ${capture.node.startPosition.row}, col ${capture.node.startPosition.column}`);
  });
});

console.log("\n=== All capture_statement nodes ===");
function findCaptures(node: Parser.SyntaxNode, depth = 0) {
  if (node.type === "capture_statement") {
    console.log(`${"  ".repeat(depth)}capture_statement at row ${node.startPosition.row}`);
    const varNode = node.childForFieldName("variable");
    if (varNode) {
      console.log(`${"  ".repeat(depth + 1)}variable field: type="${varNode.type}", text="${varNode.text}"`);
    }
  }
  for (const child of node.children) {
    findCaptures(child, depth + 1);
  }
}

findCaptures(tree.rootNode);
