import { processYamlStructure } from '../../../utils/project-builder/project-processors/processYamlStructure';
import { getReplacementsForTable } from '../../../utils/project-builder/template-processors/getReplacementsForTable';
import { replacePlaceholders } from '../../../utils/project-builder/utils/replacePlaceholders';
export const processDynamicFolders = ({
  folderName,
  children,
  schemaInfo,
  schemaInfoParsed,
  userFiles,
  projectYamlPath,
  formData,
  userMetadata,
}) => {
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
      projectYamlPath,
      undefined,
      formData,
      userMetadata,
    );
    // Process children with the current table context
    const processedChildren = processYamlStructure({
      node: children,
      schemaInfo,
      schemaInfoParsed,
      userFiles,
      projectYamlPath,
      table,
      formData,
      userMetadata,
    });
    return {
      type: 'folder',
      name: processedName,
      children: processedChildren,
    };
  });
};
