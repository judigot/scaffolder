import { IStructure } from "@/components/FileViewer.tsx";
import { ISchemaInfo } from "@/interfaces/interfaces.ts";
import { ISchemaInfoResult } from "@/utils/getSchemaInfo.ts";
import { processYamlStructure } from "@/utils/project-builder/project-processors/processYamlStructure";
import { getReplacementsForTable } from "@/utils/project-builder/template-processors/getReplacementsForTable.ts";
import { replacePlaceholders } from "@/utils/project-builder/utils/replacePlaceholders.ts";

export const processDynamicFolders = (
  folderName: string,
  children: unknown,
  schemaInfo: ISchemaInfo[],
  schemaInfoParsed: ISchemaInfoResult,
  userFiles: IStructure,
): IStructure => {
  return schemaInfo.map((table) => {
    const replacements = getReplacementsForTable(table, schemaInfoParsed);
      const processedName = replacePlaceholders(
        folderName,
        replacements,
        userFiles,
        schemaInfoParsed,
        table,
      );

      // Process children with the current table context
      const processedChildren = processYamlStructure(
        children,
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        table,
      );

      return {
        type: 'folder',
        name: processedName,
        children: processedChildren,
      };
    });
  };