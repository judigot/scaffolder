import { format as formatSQL } from 'sql-formatter';

const parseHtmlTagAttributes = (
  attributesStr: string,
): Record<string, string> => {
  const attrs: Record<string, string> = {};
  const attrRegex = /(\w+)="([^"]*)"|(\w+)='([^']*)'/g;
  let match;

  while ((match = attrRegex.exec(attributesStr)) !== null) {
    const name = match[1] || match[3];
    const value = match[2] || match[4];
    if (name) {
      attrs[name] = value;
    }
  }

  return attrs;
};

const findHtmlFormatEnd = (
  content: string,
  startIndex: number,
): { endIndex: number } | null => {
  const closeTag = '</@@FORMAT@@>';
  const closeIdx = content.indexOf(closeTag, startIndex);
  if (closeIdx === -1) {
    return null;
  }
  return { endIndex: closeIdx + closeTag.length };
};

const formatByLanguage = (content: string, language: string): string => {
  switch (language) {
    case 'sql':
      return formatSQL(content);
    default:
      return content;
  }
};

export const processHtmlFormat = (content: string): string => {
  const openRegex = /<@@FORMAT@@([^>]*)>/g;
  let result = content;
  let match;
  let iterations = 0;
  const maxIterations = 100;

  while (iterations < maxIterations) {
    iterations++;
    const matches: {
      start: number;
      end: number;
      language: string;
      innerContent: string;
    }[] = [];

    openRegex.lastIndex = 0;

    while ((match = openRegex.exec(result)) !== null) {
      const attributesStr = match[1];
      const attrs = parseHtmlTagAttributes(attributesStr);
      const language = attrs.language || '';

      const openEnd = match.index + match[0].length;
      const closeInfo = findHtmlFormatEnd(result, openEnd);

      if (closeInfo && language) {
        matches.push({
          start: match.index,
          end: closeInfo.endIndex,
          language,
          innerContent: result.slice(openEnd, closeInfo.endIndex - 13),
        });
      }
    }

    if (matches.length === 0) {
      break;
    }

    for (let i = matches.length - 1; i >= 0; i--) {
      const { start, end, language, innerContent } = matches[i];

      let formatted = innerContent.trim();

      try {
        formatted = formatByLanguage(formatted, language);
      } catch {
        // If formatting fails, keep the original content
      }

      result = result.slice(0, start) + formatted + result.slice(end);
    }
  }

  return result;
};
