import { IStructure, IFolder, IFile } from '@/components/FileViewer.tsx';
import { formatFileContent } from '@/utils/project-builder/helpers/formatFileContent.ts';
import { loadTemplateContent } from '@/utils/project-builder/utils/loadTemplateContent.ts';
import { findFolderByPath } from '@/utils/project-builder/utils/folderUtils.ts';
import {
  findFoldersWithWildcard
} from '@/utils/project-builder/template-processors/processRecursiveWildcard.ts';
import {
  RECURSIVE_WILDCARD_REGEX, FOLDER_PATH_REGEX
} from '@/utils/project-builder/constants/templateActions.ts';
import { ACTION_FLAGS } from '@/utils/project-builder/constants/actionFlags.ts';
import { changeCase } from '@/utils/common.ts';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { ISchemaInfoResult } from '@/utils/getSchemaInfo.ts';
import { getReplacementsForTable } from '@/utils/project-builder/template-processors/getReplacementsForTable.ts';
import { parseCommand } from '@/utils/project-builder/utils/parseCommand.ts';

interface ICreateBaseMethodFileOptions {
  template: string;
  outputFile: string;
  scoped?: boolean;
}

/**
 * Parses the command string to extract options for CREATE_BASE_METHOD_FILE
 */
const parseCreateBaseMethodFileOptions = (
  command: string
): ICreateBaseMethodFileOptions => {
  const { command: mainCommand, options } = parseCommand(command);
  
  const templatePath = options[ACTION_FLAGS.TEMPLATE] ?? '';
  const scoped = options[ACTION_FLAGS.SCOPED] ?? false;

  return {
    template: typeof templatePath === 'string' ? templatePath : '',
    outputFile: mainCommand,
    scoped,
  };
};

/**
 * Extracts the template file name from a template path
 */
const extractTemplateFileName = (templatePath: string): string => {
  // Check if it's a wildcard path with /**/ pattern
  const wildcardMatch = RECURSIVE_WILDCARD_REGEX.exec(templatePath);
  if (wildcardMatch) {
    // Extract the last segment after the last slash
    const segments = templatePath.split('/');
    const lastSegment = segments[segments.length - 1];
    return lastSegment.toLowerCase();
  }
  
  // For direct file paths, just get the file name after the last slash
  const segments = templatePath.split('/');
  return segments[segments.length - 1].toLowerCase();
};

/**
 * Extracts file names without extensions from all text files in a folder
 * and creates a mapping of placeholder names to file contents
 */
const extractFileNameReplacements = (files: IFile[]): Record<string, string> => {
  const replacements: Record<string, string> = {};
  
  for (const file of files) {
    // Skip non-text files or files without extensions
    if (!file.name.includes('.')) {
      continue;
    }
    
    // Extract the file name without extension
    const nameParts = file.name.split('.');
    // Remove the extension (last part)
    nameParts.pop();
    const nameWithoutExtension = nameParts.join('.');
    
    // Skip empty file names
    if (nameWithoutExtension.length === 0) {
      continue;
    }
    
    // Store the file content for this file name
    const content = file.content.trim();
    const baseKey = nameWithoutExtension.toLowerCase();
    replacements[baseKey] = content;
    
    // Generate case format variants for this file
    const caseFormats = changeCase(content);
    
    // Add all case formats as replacements with the original filename as prefix
    replacements[`${baseKey}camelcase`] = caseFormats.camelCase;
    replacements[`${baseKey}pascalcase`] = caseFormats.pascalCase;
    replacements[`${baseKey}kebabcase`] = caseFormats.kebabCase;
    replacements[`${baseKey}snakecase`] = caseFormats.snakeCase;
    replacements[`${baseKey}phrasecase`] = caseFormats.phraseCase;
    replacements[`${baseKey}titlecase`] = caseFormats.titleCase;
    replacements[`${baseKey}sentencecase`] = caseFormats.sentenceCase;
    
    // Add singular and plural variants for each case
    replacements[`${baseKey}camelcasesingular`] = caseFormats.camelCaseSingular;
    replacements[`${baseKey}pascalcasesingular`] = caseFormats.pascalCaseSingular;
    replacements[`${baseKey}kebabcasesingular`] = caseFormats.kebabCaseSingular;
    replacements[`${baseKey}snakecasesingular`] = caseFormats.snakeCaseSingular;
    replacements[`${baseKey}camelcaseplural`] = caseFormats.camelCasePlural;
    replacements[`${baseKey}pascalcaseplural`] = caseFormats.pascalCasePlural;
    replacements[`${baseKey}kebabcaseplural`] = caseFormats.kebabCasePlural;
    replacements[`${baseKey}snakecaseplural`] = caseFormats.snakeCasePlural;
  }
  
  return replacements;
};

/**
 * Process a string by replacing placeholders with values from the replacements map
 */
const applyReplacements = (
  input: string,
  replacements: Record<string, string>
): string => {
  let result = input;
  
  // Replace all {{placeholder}} patterns with their values
  for (const [key, value] of Object.entries(replacements)) {
    const placeholder = `{{${key}}}`;
    if (result.includes(placeholder)) {
      result = result.replace(new RegExp(placeholder, 'g'), value);
    }
    
    // Also try case-insensitive match
    const placeholderRegex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
    if (placeholderRegex.test(result)) {
      result = result.replace(placeholderRegex, value);
    }
    
    // Handle PascalCase variants where the key is lowercase but the template uses PascalCase
    const lowercaseKey = key.toLowerCase();
    if (lowercaseKey !== key) {
      const camelPlaceholder = `{{${lowercaseKey}}}`;
      if (result.includes(camelPlaceholder)) {
        result = result.replace(new RegExp(camelPlaceholder, 'g'), value);
      }
    }
  }
  
  return result;
};

/**
 * Creates files based on file-based template structure using wildcards
 */
export const createBaseMethodFile = (
  command: string,
  userFiles: IStructure,
  projectYamlPath: string,
  _schemaInfo?: ISchemaInfo[],
  schemaInfoParsed?: ISchemaInfoResult,
  table?: ISchemaInfo,
): IStructure => {
  // Parse options from command
  const options = parseCreateBaseMethodFileOptions(command);
  const outputFilePattern = options.outputFile;
  const templatePath = options.template;
  const isScoped = options.scoped;
  
  // Create result array and deduplication tracking
  const result: IStructure = [];
  const processedFiles = new Set<string>(); // Track file names in lowercase for case-insensitive deduplication
  
  // Validate required parameters
  if (outputFilePattern.trim() === '' || templatePath.trim() === '') {
    return [];
  }

  // Get table replacements only if --scoped flag is used and table context is available
  const tableReplacements: Record<string, string> = {};
  if (isScoped === true && table && schemaInfoParsed) {
    const rawTableReplacements = getReplacementsForTable(table, schemaInfoParsed);
    // Convert to string format for compatibility with applyReplacements
    for (const [key, value] of Object.entries(rawTableReplacements)) {
      tableReplacements[key] = Array.isArray(value) ? value.join(', ') : value;
    }
  }
  
  // Extract the template file name we're looking for
  const templateFileName = extractTemplateFileName(templatePath);
  
  // Check if using a wildcard pattern
  const recursiveWildcardMatch = RECURSIVE_WILDCARD_REGEX.exec(templatePath);
  
  // Find all folders to process
  const foldersToProcess: IFolder[] = [];
  
  if (recursiveWildcardMatch) {
    // ----- Wildcard path handling -----
    const wildcardPath = recursiveWildcardMatch[1] || '';
    
    // Normalize wildcard path if needed
    const normalizedPath = wildcardPath.startsWith('/') ? wildcardPath : `/${wildcardPath}`;
    
    // Find matching folders
    const matchingFolders = findFoldersWithWildcard(userFiles, normalizedPath);
    
    // If no matches, try more fallback approaches
    if (matchingFolders.length === 0) {
      // Find all folders in the project
      const allFolders: IFolder[] = [];
      const collectFolders = (folder: IFolder): void => {
        allFolders.push(folder);
        folder.children.forEach(child => {
          if (child.type === 'folder') {collectFolders(child);}
        });
      };
      
      // Start with root folders
      const rootFolders = userFiles.filter((item): item is IFolder => item.type === 'folder');
      rootFolders.forEach(collectFolders);
      
      // Find folders with template file
      const foldersWithTemplateFiles = allFolders.filter(folder => {
        const hasTemplateFile = folder.children.some(child =>
          child.type === 'file' && 
          child.name.toLowerCase() === templateFileName
        );
        
        return hasTemplateFile;
      });
      
      foldersToProcess.push(...foldersWithTemplateFiles);
    } else {
      // Filter for only folders that contain the template file
      const foldersWithTemplate = matchingFolders.filter(folder => {
        // Check for template file directly in this folder
        const hasTemplateFile = folder.children.some(child =>
          child.type === 'file' && 
          child.name.toLowerCase() === templateFileName
        );
        
        return hasTemplateFile;
      });
      
      foldersToProcess.push(...foldersWithTemplate);
    }
  } else {
    // ----- Direct path handling -----
    // Check if it's a folder path using the constants
    const folderMatch = FOLDER_PATH_REGEX.exec(templatePath);
    
    if (folderMatch) {
      const folderPath = folderMatch[1] || '';
      const folder = findFolderByPath(folderPath, userFiles);
      
      if (folder) {
        // Only process if the folder contains the template file
        const hasTemplateFile = folder.children.some(child =>
          child.type === 'file' && 
          child.name.toLowerCase() === templateFileName
        );
        
        if (hasTemplateFile) {
          foldersToProcess.push(folder);
        }
      }
    } else {
      // It's a direct template file - we'll handle it separately
      const templateContent = loadTemplateContent(userFiles, templatePath, projectYamlPath);
      
      if (templateContent.length > 0) {
        // For direct files, we don't have a folder context for replacements
        // Just use the filename or parent folder as a simple fallback
        const pathSegments = templatePath.split('/');
        const filename = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : '';
        
        // Extract just the name without extension
        const fileBaseName = filename.split('.')[0].toLowerCase();
        
        // Create a simple replacement mapping
        const replacements: Record<string, string> = {
          [fileBaseName]: fileBaseName,
        };
        
        // Combine with table replacements if scoped
        const combinedReplacements = { ...replacements, ...tableReplacements };
        
        // Process the filename with replacements
        const outputFileName = applyReplacements(outputFilePattern, combinedReplacements);
        const lowercaseName = outputFileName.toLowerCase();
        
        // Check for duplicates
        if (!processedFiles.has(lowercaseName)) {
          processedFiles.add(lowercaseName);
          
          // Add to result
          result.push({
            type: 'file',
            name: outputFileName,
            content: formatFileContent(templateContent),
          });
        }
      }
    }
  }
  
  // Process all collected folders
  const uniqueFolderPathsProcessed = new Set<string>();
  
  for (const folder of foldersToProcess) {
    // Avoid processing the same folder path multiple times
    const folderPath = folder.name;
    if (uniqueFolderPathsProcessed.has(folderPath)) {
      continue;
    }
    uniqueFolderPathsProcessed.add(folderPath);
    
    // Find all files in this folder
    const files = folder.children.filter((child): child is IFile => child.type === 'file');
    
    // Find template file using the extracted name
    const templateFile = files.find(file => file.name.toLowerCase() === templateFileName);
    if (!templateFile) {
      continue;
    }
    
    // Extract all file name replacements from the current directory
    const replacements = extractFileNameReplacements(files);
    
    // Combine with table replacements if available (table replacements take precedence)
    const combinedReplacements = { ...replacements, ...tableReplacements };
    
    // Skip folders with no valid replacements
    if (Object.keys(combinedReplacements).length === 0) {
      continue;
    }
    
    // Process the filename with replacements
    const outputFileName = applyReplacements(outputFilePattern, combinedReplacements);
    const lowercaseName = outputFileName.toLowerCase();
    
    // Check for duplicates
    if (processedFiles.has(lowercaseName)) {
      continue;
    }
    
    // Mark as processed
    processedFiles.add(lowercaseName);
    
    // Process template content with replacements
    const processedContent = applyReplacements(templateFile.content, combinedReplacements);
    
    // Add to result
    result.push({
      type: 'file',
      name: outputFileName,
      content: formatFileContent(processedContent),
    });
  }
  
  return result;
};
