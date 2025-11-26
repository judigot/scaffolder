import { ACTION_FLAGS } from '../../../utils/project-builder/constants/actionFlags';
import { extractFileNameFromPath } from '../../../utils/project-builder/helpers/extractFileNameFromPath';
import { formatFileContent } from '../../../utils/project-builder/helpers/formatFileContent';
import { getReplacementsForTable } from '../../../utils/project-builder/template-processors/getReplacementsForTable';
import { processIterateInTemplate } from '../../../utils/project-builder/template-processors/processIterateInTemplate';
import { processLoopTables } from '../../../utils/project-builder/template-processors/processIterateCommand';
import { loadTemplateContent } from '../../../utils/project-builder/utils/loadTemplateContent';
import { replacePlaceholders } from '../../../utils/project-builder/utils/replacePlaceholders';
export const processMultipleFiles = ({
  command: fileName,
  options = {},
  schemaInfo,
  schemaInfoParsed,
  userFiles,
  projectYamlPath,
  formData,
  userMetadata,
}) => {
  if (!fileName || fileName.length === 0) {
    return [];
  }
  // Get the template name from either the explicit template option or use the filename
  const templateOption = options[ACTION_FLAGS.TEMPLATE];
  let templateContent = '';
  if (templateOption !== undefined && templateOption.trim().length > 0) {
    templateContent = loadTemplateContent(
      userFiles,
      templateOption,
      projectYamlPath,
    );
  } else {
    templateContent = loadTemplateContent(userFiles, fileName, projectYamlPath);
  }
  const files = schemaInfo
    .filter((table) => {
      const includeTableOption = options[ACTION_FLAGS.INCLUDE_TABLE];
      const excludeTableOption = options[ACTION_FLAGS.EXCLUDE_TABLE];
      const scopedOption = options[ACTION_FLAGS.SCOPED];
      if (
        (includeTableOption?.trim().length ?? 0) > 0 ||
        (excludeTableOption?.trim().length ?? 0) > 0 ||
        scopedOption === true
      ) {
        const replacements = getReplacementsForTable(table, schemaInfoParsed);
        if (
          includeTableOption !== undefined &&
          includeTableOption.trim().length > 0
        ) {
          const processedIncludeTable = replacePlaceholders(
            includeTableOption,
            replacements,
            userFiles,
            schemaInfoParsed,
            table,
            projectYamlPath,
            fileName,
            formData,
            userMetadata,
          );
          if (table.tableName !== processedIncludeTable) {
            return false;
          }
        }
      }
      if (
        excludeTableOption !== undefined &&
        excludeTableOption.trim().length > 0
      ) {
        const replacements = getReplacementsForTable(table, schemaInfoParsed);
        const processedExcludeTable = replacePlaceholders(
          excludeTableOption,
          replacements,
          userFiles,
          schemaInfoParsed,
          table,
          projectYamlPath,
          fileName,
          formData,
          userMetadata,
        );
        if (table.tableName === processedExcludeTable) {
          return false;
        }
      }
      return true;
    })
    .map((table) => {
      const replacements = getReplacementsForTable(table, schemaInfoParsed);
      const processedName = replacePlaceholders(
        fileName,
        replacements,
        userFiles,
        schemaInfoParsed,
        table,
        projectYamlPath,
        fileName,
        formData,
        userMetadata,
      );
      const outputFileName = processedName.includes('/')
        ? extractFileNameFromPath(processedName)
        : processedName;
      let content = processLoopTables(
        templateContent,
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        formData,
        userMetadata,
      );
      content = replacePlaceholders(
        content,
        replacements,
        userFiles,
        schemaInfoParsed,
        table,
        projectYamlPath,
        typeof templateOption === 'string' && templateOption.length > 0
          ? templateOption
          : fileName,
        formData,
        userMetadata,
      );
      content = processIterateInTemplate(
        content,
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        table,
        formData,
        userMetadata,
      );
      const finalContent = formatFileContent(content);
      return {
        type: 'file',
        name: outputFileName,
        content: finalContent,
      };
    });
  return files.filter((file) => file.content.trim().length > 0);
};
