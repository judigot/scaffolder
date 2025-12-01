import { format as formatSQL } from 'sql-formatter';
import formatCode from '@/utils/formatCode.ts';
import prettier from 'prettier';
import parserBabel from 'prettier/plugins/babel';
import parserTypescript from 'prettier/plugins/typescript';
import parserHtml from 'prettier/plugins/html';
import parserPostcss from 'prettier/plugins/postcss';
import parserEstree from 'prettier/plugins/estree';

// Map extensions to Prettier parsers
const EXTENSION_TO_PARSER: Record<string, string | null> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'babel',
  jsx: 'babel',
  json: 'json',
  css: 'css',
  scss: 'scss',
  sass: 'css',
  html: 'html',
  htm: 'html',
  php: null,
  sql: null,
};

// Set of extensions we want to auto-format
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

export const shouldAutoFormat = (extension?: string): boolean => {
  if (extension == null) {
    return false;
  }
  return FORMATTABLE_EXTENSIONS.has(extension.toLowerCase());
};

export interface IAutoFormatResult {
  content: string;
  failed: boolean;
  errorMessage?: string;
}

export const autoFormatByExtension = async (
  content: string,
  fileName: string,
): Promise<IAutoFormatResult> => {
  const extension = fileName.split('.').pop()?.toLowerCase();

  if (extension == null || !shouldAutoFormat(extension)) {
    return { content, failed: false };
  }

  switch (extension) {
    case 'sql':
      try {
        return { content: formatSQL(content), failed: false };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return { content, failed: true, errorMessage };
      }

    case 'php': {
      try {
        const formatted = await formatCode(content);
        return { content: formatted.php, failed: false };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return { content, failed: true, errorMessage };
      }
    }

    default: {
      const parser = EXTENSION_TO_PARSER[extension];
      if (parser == null) {
        return { content, failed: false };
      }

      const parserPlugins: Record<string, prettier.Plugin> = {
        babel: parserBabel,
        typescript: parserTypescript,
        html: parserHtml,
        css: parserPostcss,
        scss: parserPostcss,
        json: parserBabel,
      };

      try {
        const formattedCode = await prettier.format(content, {
          parser,
          plugins: [parserEstree, parserPlugins[parser]],
          filepath: fileName,
          printWidth: 80,
          tabWidth: 2,
          useTabs: false,
          semi: true,
          singleQuote: true,
          trailingComma: 'all',
          arrowParens: 'always',
          bracketSpacing: true,
        });
        return { content: formattedCode, failed: false };
      } catch (error) {
        let errorMessage = 'Unknown formatting error';
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (
          error !== null &&
          typeof error === 'object' &&
          'message' in error
        ) {
          errorMessage = String(error.message);
        }
        return { content, failed: true, errorMessage };
      }
    }
  }
};
