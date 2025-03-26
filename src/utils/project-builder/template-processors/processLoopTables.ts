import { IStructure } from '@/components/FileViewer.tsx';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { ISchemaInfoResult } from '@/utils/getSchemaInfo.ts';
import { getReplacementsForTable } from '@/utils/project-builder/template-processors/getReplacementsForTable.ts';
import { replacePlaceholders } from '@/utils/project-builder/utils/replacePlaceholders.ts';
import { ITERATE_TABLES_REGEX } from '@/utils/project-builder/constants/templateActions.ts';

export const processLoopTables = (
  content: string,
  schemaInfo: ISchemaInfo[],
  schemaInfoParsed: ISchemaInfoResult,
  userFiles: IStructure,
): string => {
  
  return content.replace(
    ITERATE_TABLES_REGEX,
    (_match: string, templateContent: string) => {
      return schemaInfo
        .map((table) => {
          const replacements = getReplacementsForTable(table, schemaInfoParsed);
          return replacePlaceholders(
            String(templateContent).trim(),
            replacements,
            userFiles,
            schemaInfoParsed,
            table,
          );
        })
        .join('\n    '); // Add proper indentation for PHP files
    },
  );
};
