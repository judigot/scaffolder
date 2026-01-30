import type { IStructure, IFolder, IFile } from '@/components/FileViewer.tsx';
import { processRelativePath } from '@/utils/project-builder/utils/processRelativePath.ts';
import { ACTION_FLAGS } from '@/utils/project-builder/constants/actionFlags.ts';
import { TEMPLATE_OPTIONS } from '@/utils/project-builder/constants/templateActions.ts';

const navigateToFile = (store: IStructure, filePath: string): IFile | null => {
  const normPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
  const pathComponents = normPath.split('/');
  const fileName = pathComponents.pop() ?? '';

  let currentItems: IStructure = store;

  for (const component of pathComponents) {
    if (!component) {
      continue;
    }

    const folder = currentItems.find(
      (item): item is IFolder =>
        item.type === 'folder' && item.name === component,
    );

    if (!folder) {
      return null;
    }

    currentItems = folder.children;
  }

  const file = currentItems.find(
    (item): item is IFile => item.type === 'file' && item.name === fileName,
  );

  return file ?? null;
};

export const loadTemplateContent = (
  userFiles: IStructure,
  templatePath: string,
  projectFilePath?: string,
): string => {
  const resolvedPath = processRelativePath(templatePath, projectFilePath);

  const templateFile = navigateToFile(userFiles, resolvedPath);

  if (!templateFile) {
    return '';
  }

  return processTemplateContent(templateFile.content);
};

/**
 * Processes the template content by normalizing line endings and handling separators
 */
const processTemplateContent = (content: string): string => {
  function replaceOutsideTemplateSeparator(input: string): string {
    const placeholders: string[] = [];
    let index = 0;

    // Create the pattern using object literal constants instead of hardcoded flags
    const templateFlag = `--${ACTION_FLAGS.TEMPLATE}`;
    const separatorFlag = `--${TEMPLATE_OPTIONS.SEPARATOR}`;
    const pattern = new RegExp(
      `(${templateFlag}="[^"]*"|${separatorFlag}="[^"]*")`,
      'g',
    );

    // 1) Temporarily replace those segments with placeholders
    let protectedString = input.replace(pattern, (match: string) => {
      placeholders.push(match);
      const placeholder = `__PLACEHOLDER_${String(index)}__`;
      index += 1;
      return placeholder;
    });

    // 2) Replace all remaining \n (i.e., \\n) with real newlines outside placeholders
    protectedString = protectedString.replace(/\\n/g, '\n');

    // 3) Restore protected segments so that \\n in them remains intact
    protectedString = protectedString.replace(
      /__PLACEHOLDER_(\d+)__/g,
      (_: string, p1: string) => {
        const i = parseInt(p1, 10);
        return placeholders[i] ?? '';
      },
    );

    return protectedString;
  }

  return replaceOutsideTemplateSeparator(
    content
      .replace(/\r\n/g, '\n') // Normalize line endings first
      .replace(/\n/g, '\\n'),
  );
};
