import { TreeSitterLiquidProvider } from "../liquid/treeSitterLiquidProvider";

const testCases = [
  '{% assign var_name = "value" %}',
  "{% capture var_capture %}Content{% endcapture %}",
];

const parser = new TreeSitterLiquidProvider();

testCases.forEach((code) => {
  console.log(`\n=== Testing: ${code} ===`);
  const tree = parser.parseTree(code);

  if (!tree) {
    console.log("Failed to parse");
    return;
  }

  console.log("Tree structure:");
  console.log(tree.rootNode.toString());

  // Try query for assignment_statement
  try {
    const query1 = `(assignment_statement variable_name: (identifier) @var_name)`;
    console.log(`\nQuery 1: ${query1}`);
    const matches1 = parser.queryTree(query1, tree);
    console.log(`Matches: ${matches1.length}`);
    matches1.forEach((match) => {
      match.captures.forEach((capture) => {
        console.log(`  Capture: ${capture.name} = "${capture.node.text}"`);
      });
    });
  } catch (error) {
    console.log(`Query 1 error: ${error}`);
  }

  // Try query for capture_statement
  try {
    const query2 = `(capture_statement variable: (identifier) @var_name)`;
    console.log(`\nQuery 2: ${query2}`);
    const matches2 = parser.queryTree(query2, tree);
    console.log(`Matches: ${matches2.length}`);
    matches2.forEach((match) => {
      match.captures.forEach((capture) => {
        console.log(`  Capture: ${capture.name} = "${capture.node.text}"`);
      });
    });
  } catch (error) {
    console.log(`Query 2 error: ${error}`);
  }
});
