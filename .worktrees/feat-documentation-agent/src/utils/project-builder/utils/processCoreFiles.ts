import type { IStructure, IFile, IFolder } from '@/components/FileViewer.tsx';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import type { IFormStore } from '@/useFormStore.ts';
import { processCommand } from '@/utils/project-builder/template-processors/processCommand.ts';
import { getSchemaInfo } from '@/utils/getSchemaInfo.ts';
import { USE_USER_ENV_REGEX } from '@/utils/project-builder/constants/templateActions.ts';

/**
 * Recursively processes core files to handle template commands like USE_USER_ENV.
 * This allows core files to use environment variables and other template features.
 *
 * @param coreFiles - Core file structure to process
 * @param userFiles - Complete file structure (for template imports)
 * @param schemaInfo - Database schema information
 * @param formData - Form data for template processing
 * @param userMetadata - User metadata (should be decrypted) for USE_USER_ENV
 * @param projectFilePath - Path to the project structure.yaml file
 * @param onFileUsingUserEnv - Callback to track files using USE_USER_ENV
 * @returns Processed core files with template commands resolved
 */
export function processCoreFiles(
  coreFiles: IStructure,
  userFiles: IStructure,
  schemaInfo: ISchemaInfo[],
  formData: IFormStore,
  userMetadata: Record<string, unknown> | null | undefined,
  projectFilePath: string,
  onFileUsingUserEnv?: (filePath: string) => void,
): IStructure {
  const schemaInfoParsed = getSchemaInfo(schemaInfo);

  const processItem = (
    item: IFile | IFolder,
    basePath = '',
  ): IFile | IFolder => {
    if (item.type === 'file') {
      const filePath = basePath === '' ? item.name : `${basePath}/${item.name}`;

      // Check if file uses USE_USER_ENV BEFORE processing
      if (USE_USER_ENV_REGEX.test(item.content) && onFileUsingUserEnv) {
        onFileUsingUserEnv(filePath);
      }

      // Process file content with template commands
      const processedContent = processCommand(
        item.content,
        userFiles,
        schemaInfoParsed,
        undefined, // No table context for core files
        undefined, // No template file path
        projectFilePath,
        formData,
        userMetadata,
        undefined, // No data context
        false, // Don't skip loop data sources
      );

      return {
        ...item,
        content: processedContent,
      };
    } else {
      // Recursively process folder children
      const currentPath =
        basePath === '' ? item.name : `${basePath}/${item.name}`;
      return {
        ...item,
        children: item.children.map((child) => processItem(child, currentPath)),
      };
    }
  };

  return coreFiles.map((item) => processItem(item));
}
