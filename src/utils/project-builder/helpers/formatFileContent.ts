import { processHtmlFormat } from '@/utils/project-builder/template-processors/processHtmlFormat.ts';
import { autoFormatByExtension } from '@/utils/project-builder/helpers/autoFormatByExtension.ts';

export const formatFileContent = async (
  content: string,
  fileName?: string,
  shouldFormat = true,
): Promise<string> => {
  let processed = await processHtmlFormat(content);

  const hasFormatTags = content.includes('<@@FORMAT@@');

  if (
    shouldFormat &&
    fileName !== undefined &&
    fileName !== '' &&
    !hasFormatTags
  ) {
    processed = await autoFormatByExtension(processed, fileName);
  }

  return processed
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '    ')
    .replace(/\t/g, '    ')
    .trim();
};
