/**
 * Information about an include tag found in the document
 */
export interface IncludeTagInfo {
  type: "textPart" | "sharedPart";
  name: string;
  lineNumber: number;
}

export type TemplateTypes =
  | "reconciliationText"
  | "sharedPart"
  | "exportFile"
  | "accountTemplate";

export type TemplatePartType = "main" | "textPart" | "sharedPart";

export interface TemplatePart {
  type: TemplatePartType;
  name: string;
  startLine: number; // 0-based, inclusive
  endLine: number; // 0-based, inclusive
}

export type TemplateParts = TemplatePart[];

export type TemplateKey = `${TemplateTypes}/${string}`; // e.g., "reconciliationText/handle"

export type TemplateCollection = Map<TemplateKey, TemplateParts>;

// Template directories relative to workspace root
// Type > directory
export enum TemplateDirectories {
  reconciliationText = "reconciliation_texts",
  sharedPart = "shared_parts",
  exportFile = "export_files",
  accountTemplate = "account_templates",
}
