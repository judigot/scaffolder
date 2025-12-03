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

export const processDynamicFolders = async ({
  folderName,
  children,
  schemaInfo,
  schemaInfoParsed,
  userFiles,
  projectYamlPath,
  formData,
  userMetadata,
  options,
  currentPath = '',
}: IBuildContext): Promise<IStructure> => {
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

        const dataCtx = {
          userFiles,
          schemaInfo,
          schemaInfoParsed,
          projectYamlPath,
          formData,
          userMetadata,
          dataContext: augmentedData,
        };

        const processedName = replacePlaceholders(
          folderName,
          replacements,
          dataCtx,
        );

        const newPath =
          currentPath === ''
            ? processedName
            : `${currentPath}/${processedName}`;

        const processedChildren = await processYamlStructure({
          onFileUsingUserEnv: options?.onFileUsingUserEnv,
          onFileFailedToFormat: options?.onFileFailedToFormat,
          node: children,
          schemaInfo,
          schemaInfoParsed,
          userFiles,
          projectYamlPath,
          formData,
          userMetadata,
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

  return await Promise.all(
    schemaInfo.map(async (table) => {
      const replacements = getReplacementsForTable(table, schemaInfoParsed);

      const tableCtx = {
        userFiles,
        schemaInfo,
        schemaInfoParsed,
        projectYamlPath,
        table,
        formData,
        userMetadata,
      };

      const processedName = replacePlaceholders(
        folderName,
        replacements,
        tableCtx,
      );

      const newPath =
        currentPath === '' ? processedName : `${currentPath}/${processedName}`;

      const processedChildren = await processYamlStructure({
        node: children,
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        projectYamlPath,
        table,
        formData,
        userMetadata,
        onFileUsingUserEnv: options?.onFileUsingUserEnv,
        onFileFailedToFormat: options?.onFileFailedToFormat,
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
