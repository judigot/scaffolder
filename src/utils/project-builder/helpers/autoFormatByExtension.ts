import * as prettier from 'prettier/standalone';
import type { Plugin } from 'prettier';
import parserBabel from 'prettier/plugins/babel';
import parserTypescript from 'prettier/plugins/typescript';
import parserHtml from 'prettier/plugins/html';
import parserPostcss from 'prettier/plugins/postcss';
import parserEstree from 'prettier/plugins/estree';
import * as phpPlugin from '@prettier/plugin-php';
import javaPlugin from 'prettier-plugin-java';
import nginxPlugin from 'prettier-plugin-nginx';
import * as prismaPlugin from 'prettier-plugin-prisma';
import sqlPlugin from 'prettier-plugin-sql';
import * as sveltePlugin from 'prettier-plugin-svelte/browser';

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
  php: 'php',
  sql: 'sql',
  java: 'java',
  nginx: 'nginx',
  prisma: 'prisma-parse',
  svelte: 'svelte',
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
  'java',
  'nginx',
  'prisma',
  'svelte',
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

  const parser = EXTENSION_TO_PARSER[extension];
  if (parser == null) {
    return { content, failed: false };
  }

  const parserPlugins: Record<string, unknown> = {
    babel: parserBabel,
    typescript: parserTypescript,
    html: parserHtml,
    css: parserPostcss,
    scss: parserPostcss,
    json: parserBabel,
    php: phpPlugin,
    sql: sqlPlugin,
    java: javaPlugin,
    nginx: nginxPlugin,
    'prisma-parse': prismaPlugin,
    svelte: sveltePlugin,
  };

  const isPrettierPlugin = (value: unknown): value is Plugin => {
    return (
      value != null &&
      typeof value === 'object' &&
      ('parsers' in value || 'languages' in value)
    );
  };

  const plugins: Plugin[] = [parserEstree];
  const plugin = parserPlugins[parser];
  if (isPrettierPlugin(plugin)) {
    plugins.push(plugin);
  }

  try {
    const formattedCode = await prettier.format(content, {
      parser,
      plugins,
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
};
