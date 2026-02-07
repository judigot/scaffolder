import type { BuildContext } from '@/utils/project-builder/interfaces/interfaces.ts';
import {
  processLoopDataSources,
  processLoopTables,
  processLoopTablesReversed,
} from '@/utils/project-builder/template-processors/processIterateCommand.ts';

export const processTemplatePipeline = (
  content: string,
  ctx: BuildContext,
): string => {
  const tablesProcessed = processLoopTables(content, ctx);
  const reversedProcessed = processLoopTablesReversed(tablesProcessed, ctx);
  return processLoopDataSources(reversedProcessed, ctx);
};
