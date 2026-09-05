import { processHtmlFormat } from '@/utils/project-builder/template-processors/processHtmlFormat.ts';
import { autoFormatByExtension } from '@/utils/project-builder/helpers/autoFormatByExtension.ts';
import { findLeftoverTemplateMarkersInText } from '@/utils/project-builder/utils/detectLeftoverTemplateMarkers.ts';

export interface IFormatFileContentResult {
  content: string;
  failed: boolean;
  errorMessage?: string;
  leftoverTemplateMarkers?: string[];
}

export const formatFileContent = async (
  content: string,
  fileName?: string,
  shouldFormat = true,
): Promise<IFormatFileContentResult> => {
  let processed = await processHtmlFormat(content);
  let failed = false;
  let errorMessage: string | undefined;

  const leftoverTemplateMarkers = findLeftoverTemplateMarkersInText(processed);
  if (leftoverTemplateMarkers.length > 0) {
    const finalContent = processed
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '    ')
      .replace(/\t/g, '    ')
      .trim();
    return {
      content: finalContent,
      failed: false,
      leftoverTemplateMarkers,
    };
  }

  const hasFormatTags = content.includes('<@@FORMAT@@');

  if (
    shouldFormat &&
    fileName !== undefined &&
    fileName !== '' &&
    !hasFormatTags
  ) {
    const formatResult = await autoFormatByExtension(processed, fileName);
    processed = formatResult.content;
    failed = formatResult.failed;
    errorMessage = formatResult.errorMessage;
  }

  const finalContent = processed
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '    ')
    .replace(/\t/g, '    ')
    .trim();

  return { content: finalContent, failed, errorMessage };
};
