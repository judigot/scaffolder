import type { IStructure } from '@/components/FileViewer.tsx';
import { ACTION_FLAGS } from '@/utils/project-builder/constants/actionFlags.ts';
import type { IBuildContext } from '@/utils/project-builder/interfaces/interfaces.ts';
import { processYamlStructure } from '@/utils/project-builder/project-processors/processYamlStructure.ts';
import { getReplacementsForTable } from '@/utils/project-builder/template-processors/getReplacementsForTable.ts';
import { replacePlaceholders } from '@/utils/project-builder/utils/replacePlaceholders.ts';
import {
  findFilesMatchingGlob,
  createDataContextReplacements,
} from '@/utils/project-builder/utils/dataSourceUtils.ts';
import { sanitizeFileName } from '@/utils/project-builder/helpers/sanitizeFileName.ts';
import { filterViewTables } from '@/utils/project-builder/utils/filterViewTables.ts';

export const processDynamicFolders = async (
  ctx: IBuildContext,
): Promise<IStructure> => {
  const {
    folderName,
    children,
    schemaInfo,
    schemaInfoParsed,
    userFiles,
    options,
    currentPath = '',
  } = ctx;
  if (typeof folderName !== 'string') {
    throw new Error('Folder name is not a string');
  }

  const dataSourcePattern = options?.[ACTION_FLAGS.DATA_SOURCE];
  if (dataSourcePattern !== undefined && dataSourcePattern !== '') {
    const dataMatches = findFilesMatchingGlob(userFiles, dataSourcePattern);

    return await Promise.all(
      dataMatches.map(async (match) => {
        const { augmentedData, replacements } = createDataContextReplacements(
          match.data,
          match.folderPath,
        );

        let processedName = replacePlaceholders(folderName, replacements, {
          ...ctx,
          dataContext: augmentedData,
        });
        processedName = sanitizeFileName(processedName);

        const newPath =
          currentPath === ''
            ? processedName
            : `${currentPath}/${processedName}`;

        const processedChildren = await processYamlStructure({
          ...ctx,
          node: children,
          dataContext: augmentedData,
          currentPath: newPath,
        });

        return {
          type: 'folder',
          name: processedName,
          children: processedChildren,
        };
      }),
    );
  }

  /* Filter out view tables using centralized function */
  const filteredSchemaInfo = filterViewTables(schemaInfo, schemaInfoParsed);

  return await Promise.all(
    filteredSchemaInfo.map(async (table) => {
      const replacements = getReplacementsForTable(table, schemaInfoParsed);

      let processedName = replacePlaceholders(folderName, replacements, {
        ...ctx,
        table,
      });
      processedName = sanitizeFileName(processedName);

      const newPath =
        currentPath === '' ? processedName : `${currentPath}/${processedName}`;

      const processedChildren = await processYamlStructure({
        ...ctx,
        node: children,
        table,
        currentPath: newPath,
      });

      return {
        type: 'folder',
        name: processedName,
        children: processedChildren,
      };
    }),
  );
};
