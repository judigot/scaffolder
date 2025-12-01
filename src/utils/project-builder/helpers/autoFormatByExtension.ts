import { format as formatSQL } from 'sql-formatter';
import formatCode from '@/utils/formatCode.ts';
import prettier from 'prettier';
import * as phpPlugin from '@prettier/plugin-php';

const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  php: 'php',
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  json: 'json',
  css: 'css',
  scss: 'scss',
  sass: 'sass',
  html: 'html',
  htm: 'html',
  sql: 'sql',
};

const FORMATTABLE_EXTENSIONS = new Set([
  'php',
  'ts',
  'tsx',
  'js',
  'jsx',
  'json',
  'css',
  'scss',
  'sass',
  'html',
  'htm',
  'sql',
]);

export const getLanguageFromExtension = (extension?: string): string | null => {
  if (extension === undefined || extension === '') {
    return null;
  }
  return EXTENSION_TO_LANGUAGE[extension.toLowerCase()] ?? null;
};

export const shouldAutoFormat = (extension?: string): boolean => {
  if (extension === undefined || extension === '') {
    return false;
  }
  return FORMATTABLE_EXTENSIONS.has(extension.toLowerCase());
};

const autoFormatByLanguage = async (
  content: string,
  language: string,
): Promise<string> => {
  switch (language) {
    case 'sql':
      return formatSQL(content);
    case 'php': {
      const formatted = await formatCode(content);
      return formatted.php;
    }
    case 'typescript':
    case 'javascript':
    case 'json':
    case 'css':
    case 'scss':
    case 'sass':
    case 'html':
      return await formatCodeByLanguage(content, language);
    default:
      return content;
  }
};

async function formatCodeByLanguage(
  code: string,
  language: string,
): Promise<string> {
  try {
    const parser = getPrettierParser(language);
    const options: prettier.Options = {
      parser,
      printWidth: 80,
      tabWidth: 2,
      useTabs: false,
      semi: true,
      singleQuote: true,
      trailingComma: 'all',
      arrowParens: 'always',
      bracketSpacing: true,
    };

    if (parser === 'php') {
      options.plugins = [phpPlugin];
    }

    return await prettier.format(code, options);
  } catch (error) {
    console.error(`Failed to format ${language} code:`, error);
    return code;
  }
}

function getPrettierParser(language: string): string {
  const parserMap: Record<string, string> = {
    typescript: 'typescript',
    javascript: 'babel',
    json: 'json',
    css: 'css',
    scss: 'scss',
    sass: 'css',
    html: 'html',
  };
  return parserMap[language] ?? 'babel';
}

export const autoFormatByExtension = async (
  content: string,
  fileName: string,
): Promise<string> => {
  const extension = fileName.split('.').pop()?.toLowerCase();

  if (
    extension === undefined ||
    extension === '' ||
    !shouldAutoFormat(extension)
  ) {
    return content;
  }

  const language = getLanguageFromExtension(extension);
  if (language === null || language === '') {
    return content;
  }

  return await autoFormatByLanguage(content, language);
};
