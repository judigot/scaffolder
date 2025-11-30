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

export const processDynamicFolders = ({
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
}: IBuildContext): IStructure => {
  if (typeof folderName !== 'string') {
    throw new Error('Folder name is not a string');
  }

  const dataSourcePattern = options?.[ACTION_FLAGS.DATA_SOURCE];
  if (dataSourcePattern !== undefined && dataSourcePattern !== '') {
    const dataMatches = findFilesMatchingGlob(userFiles, dataSourcePattern);

    return dataMatches.map((match) => {
      const { augmentedData, replacements } = createDataContextReplacements(
        match.data,
        match.folderPath,
      );

      const processedName = replacePlaceholders(
        folderName,
        replacements,
        userFiles,
        schemaInfoParsed,
        undefined,
        projectYamlPath,
        undefined,
        formData,
        userMetadata,
        augmentedData,
      );

      const newPath =
        currentPath === '' ? processedName : `${currentPath}/${processedName}`;

      const processedChildren = processYamlStructure({
        onFileUsingUserEnv: options?.onFileUsingUserEnv,
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
    });
  }

  return schemaInfo.map((table) => {
    const replacements = getReplacementsForTable(table, schemaInfoParsed);

    const processedName = replacePlaceholders(
      folderName,
      replacements,
      userFiles,
      schemaInfoParsed,
      table,
      projectYamlPath,
      undefined,
      formData,
      userMetadata,
      undefined,
    );

    const newPath =
      currentPath === '' ? processedName : `${currentPath}/${processedName}`;

    const processedChildren = processYamlStructure({
      node: children,
      schemaInfo,
      schemaInfoParsed,
      userFiles,
      projectYamlPath,
      table,
      formData,
      userMetadata,
      onFileUsingUserEnv: options?.onFileUsingUserEnv,
      currentPath: newPath,
    });

    return {
      type: 'folder',
      name: processedName,
      children: processedChildren,
    };
  });
};
