import { IStructure, IFolder, IFile } from '@/components/FileViewer.tsx';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { ISchemaInfoResult } from '@/utils/getSchemaInfo.ts';
import { getReplacementsForTable } from '@/utils/project-builder/template-processors/getReplacementsForTable.ts';
import { replacePlaceholders } from '@/utils/project-builder/utils/replacePlaceholders.ts';
import { formatFileContent } from '@/utils/project-builder/helpers/formatFileContent.ts';
import { loadTemplateContent } from '@/utils/project-builder/utils/loadTemplateContent.ts';
import { findFolderByPath } from '@/utils/project-builder/utils/folderUtils.ts';
import {
    findFoldersWithWildcard
} from '@/utils/project-builder/template-processors/processRecursiveWildcard.ts';
import { RECURSIVE_WILDCARD_REGEX } from '@/utils/project-builder/constants/templateActions.ts';

interface ICreateBaseMethodFileOptions {
  template: string;
  outputFile: string;
}

// Look for files containing method name information
const METHOD_NAME_PATTERN = /methodName/i;

/**
 * Parses the command string to extract options for CREATE_BASE_METHOD_FILE
 */
const parseCreateBaseMethodFileOptions = (
  command: string
): ICreateBaseMethodFileOptions => {
  // Extract template option (--template=...)
  const templateMatch = /--template[= ]([^\s]+)/.exec(command);
  const templatePath = templateMatch ? String(templateMatch[1] || '') : '';
  
  // Extract the file name before any options
  const fileNameMatch = /^([^\s]+)/.exec(command);
  const outputFile = fileNameMatch ? String(fileNameMatch[1] || '') : '';

  return {
    template: templatePath,
    outputFile,
  };
};

/**
 * Find all files in a folder and its subfolders
 */
const findAllFiles = (currentFolder: IFolder): IFile[] => {
  const result: IFile[] = [];
  
  for (const child of currentFolder.children) {
    if (child.type === 'file') {
      result.push(child);
    } else {
      // If not a file, it must be a folder
      result.push(...findAllFiles(child));
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
  _schemaInfo: ISchemaInfo[],
  schemaInfoParsed: ISchemaInfoResult,
  table: ISchemaInfo,
  projectYamlPath: string,
): IStructure => {
  // Parse options from command
  const options = parseCreateBaseMethodFileOptions(command);
  const outputFilePattern = options.outputFile;
  const templatePath = options.template;
  
  // Create result array and deduplication tracking
  const result: IStructure = [];
  const processedFiles = new Set<string>(); // Track file names in lowercase for case-insensitive deduplication
  
  // Validate required parameters
  if (outputFilePattern.trim() === '' || templatePath.trim() === '') {
    console.warn('Missing required parameters (output file or template)');
    return [];
  }
  
  console.warn(`Processing template path: "${String(templatePath)}", output pattern: "${String(outputFilePattern)}"`);
  
  // Check if using a wildcard pattern
  const recursiveWildcardMatch = RECURSIVE_WILDCARD_REGEX.exec(templatePath);
  
  // Find all folders to process
  const foldersToProcess: IFolder[] = [];
  
  if (recursiveWildcardMatch) {
    // ----- Wildcard path handling -----
    const [, wildcardPath] = recursiveWildcardMatch;
    console.warn(`Using wildcard path: "${String(wildcardPath)}"`);
    
    // Normalize wildcard path if needed
    const normalizedPath = wildcardPath.startsWith('/') ? wildcardPath : `/${wildcardPath}`;
    
    // Find matching folders
    const matchingFolders = findFoldersWithWildcard(userFiles, normalizedPath);
    console.warn(`Found ${String(matchingFolders.length)} matching folders`);
    
    // If no matches, try more fallback approaches
    if (matchingFolders.length === 0) {
      console.warn(`No direct matches, trying fallbacks...`);
      
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
      
      // Find folders with method name files
      const foldersWithMethodFiles = allFolders.filter(folder => 
        folder.children.some(child => 
          child.type === 'file' && 
          (child.name.toLowerCase() === 'methodname.txt' || METHOD_NAME_PATTERN.test(child.name))
        )
      );
      
      console.warn(`Found ${String(foldersWithMethodFiles.length)} folders with method name files`);
      foldersToProcess.push(...foldersWithMethodFiles);
    } else {
      foldersToProcess.push(...matchingFolders);
    }
  } else {
    // ----- Direct path handling -----
    // Check if it's a folder path
    const folderMatch = /^\/(.+)$/.exec(templatePath);
    
    if (folderMatch) {
      const [, folderPath] = folderMatch;
      const folder = findFolderByPath(folderPath, userFiles);
      
      if (folder) {
        console.warn(`Found exact folder path: "${String(folderPath)}"`);
        foldersToProcess.push(folder);
      }
    } else {
      // It's a direct template file - we'll handle it separately
      console.warn(`Using direct template file: "${String(templatePath)}"`);
      const templateContent = loadTemplateContent(userFiles, templatePath, projectYamlPath);
      
      if (templateContent.length > 0) {
        // Extract method name from filename
        const filename = templatePath.split('/').pop() ?? '';
        const methodNameMatch = /^(\w+)\./.exec(filename);
        const methodName = methodNameMatch?.[1] ?? 'default';
        
        console.warn(`Using method name from filename: "${String(methodName)}"`);
        
        // Create custom replacements
        const customReplacements = {
          ...getReplacementsForTable(table, schemaInfoParsed),
          methodName,
        };
        
        // Process the filename with methodName placeholders
        let processedPattern = outputFilePattern;
        if (outputFilePattern.includes('{{methodName}}') || outputFilePattern.includes('{{methodname}}')) {
          processedPattern = outputFilePattern
            .replace(/\{\{methodName\}\}/g, methodName)
            .replace(/\{\{methodname\}\}/g, methodName.toLowerCase());
        }
        
        // Process template pattern
        const outputFileName = replacePlaceholders(
          processedPattern,
          customReplacements,
          userFiles,
          schemaInfoParsed,
          table,
        );
        
        const lowercaseName = outputFileName.toLowerCase();
        
        // Check for duplicates
        if (!processedFiles.has(lowercaseName)) {
          processedFiles.add(lowercaseName);
          
          // Process template content
          const processedContent = replacePlaceholders(
            templateContent,
            customReplacements,
            userFiles,
            schemaInfoParsed,
            table,
          );
          
          // Add to result
          result.push({
            type: 'file',
            name: outputFileName,
            content: formatFileContent(processedContent),
          });
          
          console.warn(`Added file from direct template: "${String(outputFileName)}"`);
        }
      }
    }
  }
  
  // Process all collected folders
  console.warn(`Processing ${String(foldersToProcess.length)} folders`);
  
  for (const folder of foldersToProcess) {
    // Find all files in this folder and subfolders
    const files = findAllFiles(folder);
    
    // Find method name file
    const methodNameFile = files.find(file => 
      file.name.toLowerCase() === 'methodname.txt' || 
      METHOD_NAME_PATTERN.test(file.name)
    );
    
    if (!methodNameFile) {
      console.warn(`No method name file found in folder: "${String(folder.name)}"`);
      continue;
    }
    
    // Get method name
    const methodName = methodNameFile.content.trim();
    if (!methodName) {
      console.warn(`Empty method name in folder: "${String(folder.name)}"`);
      continue;
    }
    
    // Find template file (sharedHook.txt)
    const templateFile = files.find(file => file.name.toLowerCase() === 'sharedhook.txt');
    if (!templateFile) {
      console.warn(`No sharedHook.txt found in folder: "${String(folder.name)}"`);
      continue;
    }
    
    console.warn(`Found method "${String(methodName)}" with template in folder: "${String(folder.name)}"`);
    
    // Create custom replacements for this method
    const customReplacements = {
      ...getReplacementsForTable(table, schemaInfoParsed),
      methodName,
    };
    
    // Process the filename with methodName placeholders
    let processedPattern = outputFilePattern;
    if (outputFilePattern.includes('{{methodName}}') || outputFilePattern.includes('{{methodname}}')) {
      processedPattern = outputFilePattern
        .replace(/\{\{methodName\}\}/g, methodName)
        .replace(/\{\{methodname\}\}/g, methodName.toLowerCase());
    }
    
    // Process output filename
    const outputFileName = replacePlaceholders(
      processedPattern,
      customReplacements,
      userFiles,
      schemaInfoParsed,
      table,
    );
    
    const lowercaseName = outputFileName.toLowerCase();
    
    // Check for duplicates
    if (processedFiles.has(lowercaseName)) {
      console.warn(`Skipping duplicate file: "${String(outputFileName)}"`);
      continue;
    }
    
    // Mark as processed
    processedFiles.add(lowercaseName);
    
    // Process template content
    const processedContent = replacePlaceholders(
      templateFile.content,
      customReplacements,
      userFiles,
      schemaInfoParsed,
      table,
    );
    
    // Add to result
    result.push({
      type: 'file',
      name: outputFileName,
      content: formatFileContent(processedContent),
    });
    
    console.warn(`Added file: "${String(outputFileName)}" with method: "${String(methodName)}"`);
  }
  
  console.warn(`Created ${String(result.length)} total files`);
  
  return result;
};
