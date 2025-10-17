import { TreeSitterLiquidProvider } from "../liquid/treeSitterLiquidProvider";
import * as Parser from "tree-sitter";

const testCases = [
  { code: "{{ var }}", desc: "Output statement with var" },
  {
    code: "{% assign var_name = var %}",
    desc: "Assignment with var on right side",
  },
  { code: '{% assign var_name = "string" %}', desc: "Assignment with string" },
  {
    code: "{% capture var_capture %}Content{% endcapture %}",
    desc: "Capture statement",
  },
  { code: "{% for item in items %}{% endfor %}", desc: "For loop" },
  { code: "{% if var %}{% endif %}", desc: "If statement with var" },
];

const parser = new TreeSitterLiquidProvider();

testCases.forEach(({ code, desc }) => {
  console.log(`\n=== ${desc} ===`);
  console.log(`Code: ${code}`);
  const tree = parser.parseTree(code);

  if (!tree) {
    console.log("Failed to parse");
    return;
  }

  console.log("Tree structure:");
  console.log(tree.rootNode.toString());

  // Find all identifiers
  console.log("\nAll identifiers:");
  function findIdentifiers(node: Parser.SyntaxNode, path: string[] = []) {
    if (node.type === "identifier") {
      console.log(
        `  "${node.text}" at ${node.startPosition.row}:${node.startPosition.column}`,
      );
      console.log(`    Path: ${path.join(" > ")}`);
      console.log(`    Parent type: ${node.parent?.type}`);

      // Check field name
      if (node.parent) {
        for (let i = 0; i < node.parent.childCount; i++) {
          if (node.parent.child(i) === node) {
            const fieldName = node.parent.fieldNameForChild(i);
            console.log(`    Field name: ${fieldName || "none"}`);
            break;
          }
        }
      }
    }

    for (const child of node.children) {
      findIdentifiers(child, [...path, node.type]);
    }
  }

  findIdentifiers(tree.rootNode);
});
