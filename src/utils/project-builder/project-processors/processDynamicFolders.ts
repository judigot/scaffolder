import type { IStructure } from '@/components/FileViewer.tsx';
import type { IBuildContext } from '@/utils/project-builder/interfaces/interfaces.ts';
import { processYamlStructure } from '@/utils/project-builder/project-processors/processYamlStructure.ts';
import { getReplacementsForTable } from '@/utils/project-builder/template-processors/getReplacementsForTable.ts';
import { replacePlaceholders } from '@/utils/project-builder/utils/replacePlaceholders.ts';

export const processDynamicFolders = ({
  folderName,
  children,
  schemaInfo,
  schemaInfoParsed,
  userFiles,
  projectYamlPath,
}: IBuildContext): IStructure => {
  return schemaInfo.map((table) => {
    const replacements = getReplacementsForTable(table, schemaInfoParsed);

    if (typeof folderName !== 'string') {
      throw new Error('Folder name is not a string');
    }

    const processedName = replacePlaceholders(
      folderName,
      replacements,
      userFiles,
      schemaInfoParsed,
      table,
    );

    // Process children with the current table context
    const processedChildren = processYamlStructure({
      node: children,
      schemaInfo,
      schemaInfoParsed,
      userFiles,
      projectYamlPath,
      table,
    });

    return {
      type: 'folder',
      name: processedName,
      children: processedChildren,
    };
  });
};
