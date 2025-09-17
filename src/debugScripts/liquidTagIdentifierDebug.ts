import { LiquidTagIdentifier } from "../liquid/liquidTagIdentifier";
import * as fs from "fs";
import * as path from "path";

const fixtureFile = path.join(__dirname, "../../fixtures/liquid_tags_reference.liquid");
const liquidContent = fs.readFileSync(fixtureFile, "utf8");
const identifier = new LiquidTagIdentifier();

console.log("=== Liquid Tags Reference Analysis ===");
console.log("File:", fixtureFile);
console.log("Content length:", liquidContent.length);
console.log("\n=== Line-by-line Analysis ===\n");

const lines = liquidContent.split("\n");

lines.forEach((line, lineIndex) => {
  if (line.trim() && !line.startsWith("#") && !line.startsWith("=>")) {
    console.log(`Line ${lineIndex + 1}: ${line}`);

    // Find liquid tag positions in the line
    const liquidTagRegex = /{%.*?%}|{{.*?}}/g;
    let match;

    while ((match = liquidTagRegex.exec(line)) !== null) {
      const startColumn = match.index;
      const endColumn = match.index + match[0].length - 1;
      const tagText = match[0];

      console.log(`  Liquid tag found: "${tagText}" at columns ${startColumn}-${endColumn}`);

      // Identify node at different positions within the tag
      for (let column = startColumn; column <= endColumn; column++) {
        const node = identifier.identifyNode(liquidContent, lineIndex, column);
        if (node) {
          const tagName = identifier.identifyTagName(node);
          console.log(`    Column ${column}: Node type="${node.type}", text="${node.text}", tagName="${tagName}"`);
          console.log(`      Node details: start=${node.startPosition.row}:${node.startPosition.column}, end=${node.endPosition.row}:${node.endPosition.column}`);

          // Show node hierarchy
          let parent = node.parent;
          let depth = 1;
          while (parent && depth <= 3) {
            console.log(`      Parent ${depth}: type="${parent.type}", text="${parent.text.substring(0, 50)}${parent.text.length > 50 ? "..." : ""}"`);
            parent = parent.parent;
            depth++;
          }

          // Show children
          if (node.children.length > 0) {
            console.log(`      Children (${node.children.length}):`);
            node.children.forEach((child, childIndex) => {
              console.log(`        Child ${childIndex}: type="${child.type}", text="${child.text}"`);
            });
          }

          break; // Only show details for the first valid node found in this tag
        }
      }
    }
    console.log();
  }
});

console.log("\n=== Summary ===");
console.log("Analysis complete. Check the output above for detailed node information.");