import { processHtmlFormat } from '@/utils/project-builder/template-processors/processHtmlFormat.ts';

export const formatFileContent = (content: string): string => {
  const processed = processHtmlFormat(content);

  return processed
    .replace(/\\n/g, '\n') // Replace \n with actual newlines
    .replace(/\\t/g, '    ') // Replace \t with four spaces
    .replace(/\t/g, '    ') // Replace tab characters with four spaces
    .trim();
};
