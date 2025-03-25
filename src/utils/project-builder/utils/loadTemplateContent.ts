import { IStructure, IFolder, IFile } from '@/components/FileViewer.tsx';

export const loadTemplateContent = (userFiles: IStructure,templatePath: string): string => {
  const store = userFiles;

  // Check if templatePath starts with a forward slash indicating an absolute path
  if (templatePath.startsWith('/')) {
    // Remove the leading slash
    const normPath = templatePath.substring(1);

    // Split the path into components
    const pathComponents = normPath.split('/');
    const lastComponent = pathComponents.pop();
    const templateName = lastComponent ?? '';

    // Navigate through the directory structure
    let currentItems: IStructure = store;

    for (const component of pathComponents) {
      const folder = currentItems.find(
        (item): item is IFolder =>
          item.type === 'folder' && item.name === component,
      );

      if (!folder) {
        console.warn(`Folder not found in path: ${component}`);
        return '';
      }

      currentItems = folder.children;
    }

    // Find the template file in the final directory
    const templateFile = currentItems.find(
      (item): item is IFile =>
        item.type === 'file' && item.name === templateName,
    );

    if (!templateFile) {
      console.warn(
        `Template file not found: ${templateName} in specified path`,
      );
      return '';
    }

    function replaceOutsideTemplateSeparator(input: string): string {
      const placeholders: string[] = [];
      let index = 0;

      const pattern = /(--template="[^"]*"|--separator="[^"]*")/g;

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
      templateFile.content
        .replace(/\r\n/g, '\n') // Normalize line endings first
        .replace(/\n/g, '\\n'),
    );
  } else {
    // Handle the original case (just the filename without path)
    // Look only in the root for the template file
    const templateFile = store.find(
      (item): item is IFile =>
        item.type === 'file' && item.name === templatePath,
    );

    if (templateFile) {
      function replaceOutsideTemplateSeparator(input: string): string {
        const placeholders: string[] = [];
        let index = 0;

        const pattern = /(--template="[^"]*"|--separator="[^"]*")/g;

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
        templateFile.content
          .replace(/\r\n/g, '\n') // Normalize line endings first
          .replace(/\n/g, '\\n'),
      );
    }

    console.warn(`Template file not found in root: ${templatePath}`);
    return '';
  }
};
