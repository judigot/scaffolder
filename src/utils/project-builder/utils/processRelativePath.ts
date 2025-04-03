import { extractFileNameFromPath } from '@/utils/project-builder/helpers/extractFileNameFromPath.ts';

/**
 * Determines if a path is relative
 * @param path The path to check
 * @returns True if the path is relative (starts with './' or doesn't start with '/')
 */
export const isPathRelative = (path: string): boolean => {
  // A path is relative if it starts with './' or doesn't start with '/'
  return path.startsWith('./') || !path.startsWith('/');
};

/**
 * Extracts the directory path from a full file path
 * @param filePath The full file path
 * @returns The directory portion of the path
 */
export const getProjectDirectory = (filePath: string): string => {
  if (!filePath || filePath.length === 0) {
    return '';
  }
  
  const pathComponents = filePath.split('/');
  // Remove the file name to get just the directory path
  pathComponents.pop();
  return pathComponents.join('/');
};

/**
 * Processes a relative path using the project file's directory as the base
 * @param path The path to process (may be relative or absolute)
 * @param projectFilePath The full path to the project file
 * @returns Absolute path resolved against the project directory, or the original path if it's already absolute
 */
export const processRelativePath = (
  path: string,
  projectFilePath?: string
): string => {
  // If no project file path is provided or path is absolute, return as is
  if (projectFilePath === undefined || projectFilePath.length === 0 || !isPathRelative(path)) {
    return path;
  }
  
  // Remove './' prefix if it exists
  const normalizedPath = path.startsWith('./') 
    ? path.substring(2) 
    : path;
  
  // Get the directory of the project file
  const projectDir = getProjectDirectory(projectFilePath);
  
  // Combine project directory with the relative path
  const absolutePath = projectDir.length > 0
    ? `${projectDir}/${normalizedPath}`
    : normalizedPath;
  
  console.warn(`[Path] Relative path detected: ${String(path)}`);
  console.warn(`[Path] Resolved to: ${String(absolutePath)}`);
  
  return absolutePath;
};

/**
 * Alternative method for processing relative template paths using flags
 * This version is compatible with the existing flags-based approach in processYamlStructure
 * @param templatePath The template path to process
 * @param projectYamlPath The full path to the project YAML file
 * @param isRelativeFlag Whether the path is explicitly marked as relative via a flag
 * @returns The processed path
 */
export const processTemplatePathWithFlag = (
  templatePath: string | undefined,
  projectYamlPath: string,
  isRelativeFlag: boolean
): string | undefined => {
  if (templatePath === undefined || templatePath.length === 0 || !isRelativeFlag) {
    return templatePath;
  }

  // Remove the filename from the full YAML path to get the base project path
  const projectDirectory = projectYamlPath.replace(
    extractFileNameFromPath(projectYamlPath),
    '',
  );

  // Clean the template path: remove any leading './'
  let cleanedTemplatePath = templatePath;
  if (cleanedTemplatePath.startsWith('./')) {
    cleanedTemplatePath = cleanedTemplatePath.slice(2);
  }

  // Clean the project directory: remove any trailing slash
  const normalizedProjectDirectory = projectDirectory.replace(/\/+$/, '');

  // Combine the base project directory with the cleaned template path
  const resolvedPath = `${normalizedProjectDirectory}/${cleanedTemplatePath}`;
  
  console.warn(`[Template Path] Relative path detected: ${String(templatePath)}`);
  console.warn(`[Template Path] Resolved to: ${String(resolvedPath)}`);
  
  return resolvedPath;
};
