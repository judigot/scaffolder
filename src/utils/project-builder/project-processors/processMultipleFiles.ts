import type { IFile } from '@/components/FileViewer.tsx';
import { ACTION_FLAGS } from '@/utils/project-builder/constants/actionFlags.ts';
import { extractFileNameFromPath } from '@/utils/project-builder/helpers/extractFileNameFromPath.ts';
import { sanitizeFileName } from '@/utils/project-builder/helpers/sanitizeFileName.ts';
import { formatFileContent } from '@/utils/project-builder/helpers/formatFileContent.ts';
import type {
  IActionFlags,
  IBuildContext,
} from '@/utils/project-builder/interfaces/interfaces.ts';
import { getReplacementsForTable } from '@/utils/project-builder/template-processors/getReplacementsForTable.ts';
import { processIterateInTemplate } from '@/utils/project-builder/template-processors/processIterateInTemplate.ts';
import {
  processHtmlLoopColumnsInfo,
  processHtmlLoopArray,
  evaluateCondition,
} from '@/utils/project-builder/template-processors/processIterateCommand.ts';
import { processTemplatePipeline } from '@/utils/project-builder/template-processors/processTemplatePipeline.ts';
import { loadTemplateContent } from '@/utils/project-builder/utils/loadTemplateContent.ts';
import { replacePlaceholders } from '@/utils/project-builder/utils/replacePlaceholders.ts';
import {
  USE_USER_ENV_REGEX,
  USE_CONSTANT_REGEX,
} from '@/utils/project-builder/constants/templateActions.ts';
import { filterViewTables } from '@/utils/project-builder/utils/filterViewTables.ts';

/* Regex to match USE_CONSTANT(...) without brackets (for command options) */
const USE_CONSTANT_OPTION_REGEX = /USE_CONSTANT\(([^)]+)\)/;
import {
  loadConstant,
  loadConstantFromPath,
} from '@/utils/project-builder/template-processors/loadConstant.ts';

interface IMultipleFilesContext extends Omit<IBuildContext, 'table'> {
  command: string;
  options?: IActionFlags;
}

const buildAbsolutePath = (fileName: string, currentPath: string): string => {
  if (currentPath === '') {
    return fileName;
  }
  return `${currentPath}/${fileName}`;
};

export const processMultipleFiles = async (
  ctx: IMultipleFilesContext,
): Promise<IFile[]> => {
  const {
    command: fileName,
    options = {},
    schemaInfo,
    schemaInfoParsed,
    userFiles,
    projectYamlPath,
    formData,
    userMetadata,
    onFileUsingUserEnv,
    onFileFailedToFormat,
    currentPath = '',
  } = ctx;
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

  // Check if template uses USE_USER_ENV BEFORE processing
  // This detects usage even if the pattern gets replaced successfully
  if (
    templateContent.length > 0 &&
    USE_USER_ENV_REGEX.test(templateContent) &&
    onFileUsingUserEnv
  ) {
    // For FILE_LOOP, we'll track each generated file name
    // The actual file names will be determined during processing
    // We'll track them in the map function below
  }

  /* Parse ignore list from options */
  const ignoreOption = options.ignore;
  const ignoreList: string[] = [];

  if (
    ignoreOption !== undefined &&
    typeof ignoreOption === 'string' &&
    ignoreOption.trim().length > 0
  ) {
    /* Parse ignore list with flexible whitespace and handle USE_CONSTANT */
    ignoreOption.split(',').forEach((item) => {
      const trimmed = item.trim();
      /* Try USE_CONSTANT(...) without brackets first (for command options) */
      const constantMatch =
        USE_CONSTANT_OPTION_REGEX.exec(trimmed) ??
        USE_CONSTANT_REGEX.exec(trimmed);

      if (constantMatch) {
        const constantValue = constantMatch[1];
        /* Check if this is a file path (contains '/' or ends with '.yaml') */
        const isFilePath =
          constantValue.includes('/') || constantValue.endsWith('.yaml');

        if (isFilePath) {
          /* Load from file path (supports relative and absolute paths) */
          const values = loadConstantFromPath(
            constantValue,
            userFiles,
            schemaInfoParsed,
            undefined /* No table context for ignore list */,
            projectYamlPath,
            formData,
            userMetadata,
          );
          ignoreList.push(...values);
        } else {
          /* Load from Constants folder (legacy behavior) */
          const values = loadConstant(
            constantValue,
            userFiles,
            schemaInfoParsed,
            undefined /* No table context for ignore list */,
            projectYamlPath,
            formData,
            userMetadata,
          );
          ignoreList.push(...values);
        }
      } else {
        /* Direct table name (no USE_CONSTANT) */
        ignoreList.push(trimmed);
      }
    });
  }

  /* Filter out view tables first using centralized function */
  const schemaInfoWithoutViews = filterViewTables(schemaInfo, schemaInfoParsed);

  const filteredSchemaInfo = schemaInfoWithoutViews.filter((table) => {
    /* Check if table should be ignored */
    if (ignoreList.includes(table.tableName)) {
      return false;
    }

    const includeTableOption = options[ACTION_FLAGS.INCLUDE_TABLE];
    const excludeTableOption = options[ACTION_FLAGS.EXCLUDE_TABLE];
    const scopedOption = options[ACTION_FLAGS.SCOPED];
    const filterOption = options[ACTION_FLAGS.FILTER];

    // Get replacements for this table (needed for filter and other options)
    const replacements = getReplacementsForTable(table, schemaInfoParsed);

    // Evaluate filter condition if provided (e.g., "hasCompositePrimaryKey() NOT EQUAL 'true'")
    if (
      filterOption !== undefined &&
      typeof filterOption === 'string' &&
      filterOption.trim().length > 0
    ) {
      const filterResult = evaluateCondition(filterOption, replacements);
      if (!filterResult) {
        return false;
      }
    }

    if (
      (includeTableOption?.trim().length ?? 0) > 0 ||
      (excludeTableOption?.trim().length ?? 0) > 0 ||
      scopedOption === true
    ) {
      if (
        includeTableOption !== undefined &&
        includeTableOption.trim().length > 0
      ) {
        const processedIncludeTable = replacePlaceholders(
          includeTableOption,
          replacements,
          { ...ctx, table },
          fileName,
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
      const processedExcludeTable = replacePlaceholders(
        excludeTableOption,
        replacements,
        { ...ctx, table },
        fileName,
      );
      if (table.tableName === processedExcludeTable) {
        return false;
      }
    }

    return true;
  });

  const files = await Promise.all(
    filteredSchemaInfo.map(async (table, index) => {
      const replacements = getReplacementsForTable(
        table,
        schemaInfoParsed,
        index,
        filteredSchemaInfo.length,
      );
      const processedName = replacePlaceholders(
        fileName,
        replacements,
        { ...ctx, table },
        fileName,
      );

      let outputFileName = processedName.includes('/')
        ? extractFileNameFromPath(processedName)
        : processedName;

      // Sanitize filename to remove invalid Windows characters
      outputFileName = sanitizeFileName(outputFileName);

      // Track file if template uses USE_USER_ENV
      if (USE_USER_ENV_REGEX.test(templateContent) && onFileUsingUserEnv) {
        onFileUsingUserEnv(buildAbsolutePath(outputFileName, currentPath));
      }

      let content = processTemplatePipeline(templateContent, {
        ...ctx,
        table,
      });

      // Process columnsInfo loops for FILE_LOOP (scoped context)
      content = processHtmlLoopColumnsInfo(
        content,
        table,
        schemaInfoParsed,
        userFiles,
        formData,
        userMetadata,
        ctx.dataContext,
        ctx.mockData,
      );

      // Process generic array loops (compositePrimaryKey, etc.)
      content = processHtmlLoopArray(
        content,
        table,
        schemaInfoParsed,
        userFiles,
        formData,
        userMetadata,
        ctx.dataContext,
      );

      content = replacePlaceholders(
        content,
        replacements,
        { ...ctx, table },
        typeof templateOption === 'string' && templateOption.length > 0
          ? templateOption
          : fileName,
      );
      content = processIterateInTemplate(content, {
        ...ctx,
        table,
      });

      const shouldFormat = options[ACTION_FLAGS.FORMAT] !== false;
      const formatResult = await formatFileContent(
        content,
        outputFileName,
        shouldFormat,
      );

      if (formatResult.failed && onFileFailedToFormat) {
        onFileFailedToFormat(
          buildAbsolutePath(outputFileName, currentPath),
          formatResult.errorMessage ?? 'Unknown formatting error',
        );
      }

      return {
        type: 'file' as const,
        name: outputFileName,
        content: formatResult.content,
      } satisfies IFile;
    }),
  );

  return files.filter((file) => file.content.trim().length > 0);
};
