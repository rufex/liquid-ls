import { URI } from "vscode-uri";
import { TemplateTypes, TemplateDirectories, TemplateUriInfo } from "../types";

/**
 * Parses a template URI to extract comprehensive template information
 * @param uri The URI string to parse
 * @returns TemplateUriInfo object or null if not a valid template file
 */
export function parseTemplateUri(uri: string): TemplateUriInfo | null {
  try {
    const parsedUri = URI.parse(uri);
    const fullPath = parsedUri.fsPath;

    // Split path into segments for analysis
    const pathSegments = fullPath
      .split("/")
      .filter((segment) => segment.length > 0);

    // Must end with .liquid extension
    if (!fullPath.endsWith(".liquid")) {
      return null;
    }

    // Check for shared parts pattern: /workspace/shared_parts/part_name/part_name.liquid
    const sharedPartsIndex = pathSegments.findIndex(
      (segment) => segment === "shared_parts",
    );
    if (
      sharedPartsIndex !== -1 &&
      pathSegments.length >= sharedPartsIndex + 3
    ) {
      const partName = pathSegments[sharedPartsIndex + 1];
      const fileName = pathSegments[pathSegments.length - 1];

      // Validate shared part structure: shared_parts/part_name/part_name.liquid
      if (fileName === `${partName}.liquid`) {
        return {
          templateType: "sharedPart",
          templateName: partName,
          partType: "sharedPart",
          partName: partName,
          fullPath: fullPath,
        };
      }
    }

    // Check for template directory patterns
    for (const [templateType, directory] of Object.entries(
      TemplateDirectories,
    )) {
      const dirIndex = pathSegments.findIndex(
        (segment) => segment === directory,
      );

      if (dirIndex !== -1 && pathSegments.length >= dirIndex + 3) {
        const templateName = pathSegments[dirIndex + 1];
        const fileName = pathSegments[pathSegments.length - 1];

        // Check if it's a main template file: template_dir/template_name/main.liquid
        if (fileName === "main.liquid" && pathSegments.length === dirIndex + 3) {
          return {
            templateType: templateType as TemplateTypes,
            templateName: templateName,
            partType: "main",
            partName: "main",
            fullPath: fullPath,
          };
        }

        // Check if it's a text part: template_dir/template_name/text_parts/part.liquid
        const textPartsIndex = pathSegments.findIndex(
          (segment) => segment === "text_parts",
        );
        if (
          textPartsIndex > dirIndex &&
          textPartsIndex < pathSegments.length - 1
        ) {
          const partName = fileName.replace(".liquid", "");

          return {
            templateType: templateType as TemplateTypes,
            templateName: templateName,
            partType: "textPart",
            partName: partName,
            fullPath: fullPath,
          };
        }
      }
    }

    return null;
  } catch (error) {
    // Invalid URI format
    return null;
  }
}

/**
 * Checks if a URI represents a template file
 * @param uri The URI string to check
 * @returns boolean indicating if it's a template file
 */
export function isTemplateUri(uri: string): boolean {
  return parseTemplateUri(uri) !== null;
}

