export const LiquidNodeTypes = {
  TranslationExpression: "translation_expression",
  TranslationStatement: "translation_statement",
  AssignmentStatement: "assignment_statement",
  IfStatement: "if_statement",
  ForStatement: "for_loop_statement",
  UnlessStatement: "unless_statement",
  CaptureStatement: "capture_statement",
  LiquidTag: "liquid_tag",
  CustomUnpairedStatement: "custom_unpaired_statement",
  IncludeStatement: "include_statement",
  ResultStatement: "result_statement",
} as const;

export type LiquidNodeType =
  (typeof LiquidNodeTypes)[keyof typeof LiquidNodeTypes];

export const LiquidNodeTagNames = {
  assignment_statement: "assign",
  capture_statement: "capture",
  if_statement: "if",
  for_loop_statement: "for",
  unless_statement: "unless",
} as const;

export type LiquidTagName =
  (typeof LiquidNodeTagNames)[keyof typeof LiquidNodeTagNames];

/**
 * Information about an include tag found in the document
 */
export interface IncludeTagInfo {
  type: "textPart" | "sharedPart";
  name: string;
  lineNumber: number;
}
