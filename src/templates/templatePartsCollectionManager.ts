import { Logger } from "../logger";
import { TemplatePartsMapper } from "./templatePartsMapper";
import {
  TemplateTypes,
  TemplateParts,
  TemplateKey,
  TemplateCollection,
} from "../types";

/**
 * Singleton class that manages a collection of template parts mappings.
 * Provides methods to load, refresh, and retrieve template parts with caching.
 * Each template is identified by a unique key in the format "templateType/templateName".
 *
 * @example
 * const manager = TemplatePartsCollectionManager.getInstance(workspaceRoot);
 * const parts = await manager.getMap('reconciliationText', 'my_template');
 * await manager.loadMap('accountTemplate', 'invoice_template');
 */
export class TemplatePartsCollectionManager {
  private static instance: TemplatePartsCollectionManager | null = null;
  private logger: Logger = new Logger("TemplatePartsCollectionManager", {
    consoleLog: true,
  });
  private loadedMaps: TemplateCollection = new Map();
  private templatePartsMapper: TemplatePartsMapper;

  private constructor(workspaceRoot: string) {
    this.templatePartsMapper = new TemplatePartsMapper(workspaceRoot);
  }

  /**
   * Gets the singleton instance of TemplatePartsCollectionManager
   * @param workspaceRoot The workspace root path (required on first call)
   * @returns The singleton instance
   */
  public static getInstance(
    workspaceRoot?: string,
  ): TemplatePartsCollectionManager {
    if (!TemplatePartsCollectionManager.instance) {
      if (!workspaceRoot) {
        throw new Error(
          "workspaceRoot is required when creating the first instance",
        );
      }
      TemplatePartsCollectionManager.instance =
        new TemplatePartsCollectionManager(workspaceRoot);
    }
    return TemplatePartsCollectionManager.instance;
  }

  /**
   * Loads or refreshes a template's parts mapping.
   * If the template already exists in the collection, it will be refreshed.
   * @param templateType The type of template to load
   * @param templateName The name of the template to load
   * @returns Promise resolving to the template parts or null if loading failed
   */
  public async loadMap(
    templateType: TemplateTypes,
    templateName: string,
  ): Promise<TemplateParts | null> {
    const templateKey = this.generateTemplateKey(templateType, templateName);

    this.logger.debug(`Loading or refreshing template: ${templateKey}`);

    try {
      const templateParts = this.templatePartsMapper.generateTemplateMap(
        templateType,
        templateName,
      );

      if (templateParts) {
        this.loadedMaps.set(templateKey, templateParts);
        this.logger.debug(
          `Successfully loaded template: ${templateKey} with ${templateParts.length} parts`,
        );
      } else {
        this.logger.warn(`Failed to load template: ${templateKey}`);
        this.loadedMaps.delete(templateKey);
      }

      return templateParts;
    } catch (error) {
      this.logger.error(`Error loading template ${templateKey}: ${error}`);
      this.loadedMaps.delete(templateKey);
      return null;
    }
  }

  /**
   * Gets a template's parts mapping.
   * If the template is not in the collection, it will be loaded automatically.
   * @param templateType The type of template to get
   * @param templateName The name of the template to get
   * @returns Promise resolving to the template parts or null if not found/loadable
   */
  public async getMap(
    templateType: TemplateTypes,
    templateName: string,
  ): Promise<TemplateParts | null> {
    const templateKey = this.generateTemplateKey(templateType, templateName);

    if (this.loadedMaps.has(templateKey)) {
      const loadedParts = this.loadedMaps.get(templateKey)!;
      this.logger.debug(
        `Retrieved cached template: ${templateKey} with ${loadedParts.length} parts`,
      );
      return loadedParts;
    }

    // Load if not in collection
    this.logger.debug(`Template not cached, loading: ${templateKey}`);
    return await this.loadMap(templateType, templateName);
  }

  /**
   * Generates the template key from template type and name
   * @param templateType The type of template
   * @param templateName The name of the template
   * @returns The template key in format "templateType/templateName"
   */
  private generateTemplateKey(
    templateType: TemplateTypes,
    templateName: string,
  ): TemplateKey {
    return `${templateType}/${templateName}`;
  }
}
