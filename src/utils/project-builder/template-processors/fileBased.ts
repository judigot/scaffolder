import { IFolder, IStructure } from '@/components/FileViewer.tsx';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { ISchemaInfoResult } from '@/utils/getSchemaInfo.ts';
import { changeCase } from '@/utils/common.ts';
import { getReplacementsForTable } from '@/utils/project-builder/template-processors/getReplacementsForTable.ts';
import { replacePlaceholders } from '@/utils/project-builder/utils/replacePlaceholders.ts';
import { importTemplateAsPlaceholder } from '@/utils/project-builder/template-processors/importTemplateAsPlaceholder.ts';

export const processFileBasedTemplate = (
  folderPath: string,
  userFiles: IStructure,
  schemaInfoParsed: ISchemaInfoResult,
  table: ISchemaInfo,
  template: string,
  includedFiles: string[] = [],
  excludedFiles: string[] = [],
  separator = '\n',
  projectFilePath?: string,
): string => {
  // Navigate to the specified folder path
  const pathParts = folderPath.split('/').filter(Boolean);
  let currentFolder: IFolder | undefined;

  // Start from root
  const store = userFiles;

  // Find the target folder
  if (pathParts.length > 0) {
    // Find the first level folder
    currentFolder = store.find(
      (item): item is IFolder =>
        item.type === 'folder' && item.name === pathParts[0],
    );

    // Navigate through the rest of the path
    for (let i = 1; i < pathParts.length && currentFolder; i++) {
      currentFolder = currentFolder.children.find(
        (item): item is IFolder =>
          item.type === 'folder' && item.name === pathParts[i],
      );
    }
  }

  if (!currentFolder) {
    return ''; // Folder not found
  }

  // Process each subfolder as an item for iteration
  const results: string[] = [];

  currentFolder.children.forEach((item) => {
    if (item.type === 'folder') {
      // Each subfolder represents a complete item with various properties

      // Apply include/exclude filters based on the folder name
      const shouldInclude =
        includedFiles.length === 0 ||
        includedFiles.some((pattern) => item.name.includes(pattern));

      const shouldExclude =
        excludedFiles.length > 0 &&
        excludedFiles.some((pattern) => item.name.includes(pattern));

      // Skip this folder if it doesn't meet the include/exclude criteria
      if (!shouldInclude || shouldExclude) {
        return;
      }

      // Extract values from files in the folder
      const folderValues: Record<string, string> = {
        // Include the folder name as a default value
        value: item.name,
      };

      // Process each file in the subfolder
      item.children.forEach((fileItem) => {
        if (fileItem.type === 'file') {
          // Get the property name from the file name (without extension)
          const propertyName = fileItem.name.replace(/\.[^.]+$/, '');
          // Use the content as the property value
          folderValues[propertyName] = fileItem.content;
        }
      });

      // Get all case variations for each value
      Object.entries(folderValues).forEach(([key, value]) => {
        if (key !== 'value') {
          const caseFormats = changeCase(value);
          
          // Add case variations for this property
          folderValues[`${key}TitleCase`] = caseFormats.titleCase;
          folderValues[`${key}SentenceCase`] = caseFormats.sentenceCase;
          folderValues[`${key}PhraseCase`] = caseFormats.phraseCase;
          folderValues[`${key}PascalCase`] = caseFormats.pascalCase;
          folderValues[`${key}CamelCase`] = caseFormats.camelCase;
          folderValues[`${key}KebabCase`] = caseFormats.kebabCase;
          folderValues[`${key}SnakeCase`] = caseFormats.snakeCase;
          
          // Plural variations
          folderValues[`${key}Plural`] = caseFormats.plural;
          folderValues[`${key}TitleCasePlural`] = caseFormats.titleCasePlural;
          folderValues[`${key}SentenceCasePlural`] = caseFormats.sentenceCasePlural;
          folderValues[`${key}PhraseCasePlural`] = caseFormats.phraseCasePlural;
          folderValues[`${key}PascalCasePlural`] = caseFormats.pascalCasePlural;
          folderValues[`${key}CamelCasePlural`] = caseFormats.camelCasePlural;
          folderValues[`${key}KebabCasePlural`] = caseFormats.kebabCasePlural;
          folderValues[`${key}SnakeCasePlural`] = caseFormats.snakeCasePlural;
          
          // Singular variations
          folderValues[`${key}Singular`] = caseFormats.singular;
          folderValues[`${key}TitleCaseSingular`] = caseFormats.titleCaseSingular;
          folderValues[`${key}SentenceCaseSingular`] = caseFormats.sentenceCaseSingular;
          folderValues[`${key}PhraseCaseSingular`] = caseFormats.phraseCaseSingular;
          folderValues[`${key}PascalCaseSingular`] = caseFormats.pascalCaseSingular;
          folderValues[`${key}CamelCaseSingular`] = caseFormats.camelCaseSingular;
          folderValues[`${key}KebabCaseSingular`] = caseFormats.kebabCaseSingular;
          folderValues[`${key}SnakeCaseSingular`] = caseFormats.snakeCaseSingular;
        }
      });

      // Process nested placeholders within folder values
      // This allows properties to reference each other
      try {
        // First, process any placeholders within the folder values
        const processedFolderValues = { ...folderValues };
        for (const [key, value] of Object.entries(folderValues)) {
          if (typeof value === 'string' && value.includes('{{')) {
            const processed = importTemplateAsPlaceholder(value, folderValues);
            processedFolderValues[key] = typeof processed === 'string' 
              ? processed 
              : Array.isArray(processed) 
                ? processed.join(', ') 
                : String(processed);
          }
        }

        // Add table replacements for other placeholders that might be in the template
        const replacements = {
          ...getReplacementsForTable(table, schemaInfoParsed),
          ...processedFolderValues,
        };

        // Apply template with replacements
        const processedTemplate = replacePlaceholders(
          template,
          replacements,
          userFiles,
          schemaInfoParsed,
          table,
          projectFilePath,
          folderPath
        );

        results.push(processedTemplate);
      } catch {
        // If there's an error in processing nested placeholders, fall back to the original behavior
        
        // Add table replacements for other placeholders that might be in the template
        const replacements = {
          ...getReplacementsForTable(table, schemaInfoParsed),
          ...folderValues,
        };

        // Apply template with replacements without trying to resolve nested placeholders
        const processedTemplate = replacePlaceholders(
          template,
          replacements,
          userFiles,
          schemaInfoParsed,
          table,
          projectFilePath,
          folderPath
        );

        results.push(processedTemplate);
      }
    }
  });

  // Join results with the specified separator
  return results.join(separator);
};
