import { IStructure } from '@/components/FileViewer.tsx';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { ISchemaInfoResult } from '@/utils/getSchemaInfo.ts';
import { getReplacementsForTable } from '@/utils/project-builder/template-processors/getReplacementsForTable.ts';
import { replacePlaceholders } from '@/utils/project-builder/utils/replacePlaceholders.ts';

export const processLoopTables = (
  content: string,
  schemaInfo: ISchemaInfo[],
  schemaInfoParsed: ISchemaInfoResult,
  userFiles: IStructure,
): string => {
  // Handle regular table loops
  const loopRegex = /\[\[LOOP_TABLES\s+([^\]]+)\]\]/g;
  return content.replace(loopRegex, (_match: string, loopContent: string) => {
    return schemaInfo
      .map((table) => {
        const replacements = getReplacementsForTable(table, schemaInfoParsed);
        return replacePlaceholders(
          String(loopContent).trim(),
          replacements,
          userFiles,
          schemaInfoParsed,
          table,
        );
      })
      .join('\n    '); // Add proper indentation for PHP files
  });
};
