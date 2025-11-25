import { ACTION_FLAGS } from '@/utils/project-builder/constants/actionFlags.ts';

const LOOP = 'LOOP';

export const TEMPLATE_ACTIONS = {
  LOOP,
  USE_CONSTANT: 'USE_CONSTANT',
  USE_FORM_DATA: 'USE_FORM_DATA',
  USE_USER_ENV: 'USE_USER_ENV',
  USE_TEMPLATE: 'USE_TEMPLATE',
  LOOP_TABLES: `${LOOP}(tables)`,
  LOOP_COLUMNS: `${LOOP}(columns)`,
} as const;

// Template option flags for template commands
export const TEMPLATE_OPTIONS = {
  SEPARATOR: 'separator',
  FILTER: 'filter',
  IGNORE: 'ignore',
  INCLUDE_FILES: 'include-files',
  EXCLUDE_FILES: 'exclude-files',
  REMOVE_DUPLICATES: 'removeDuplicates',
} as const;

export type ProjectAction =
  (typeof TEMPLATE_ACTIONS)[keyof typeof TEMPLATE_ACTIONS];

export type TemplateOption =
  (typeof TEMPLATE_OPTIONS)[keyof typeof TEMPLATE_OPTIONS];

// Regex pattern helper functions
export const REGEX_PATTERNS = {
  TEMPLATE_OPTION: (flag: string) => `--${flag}="(.*?)"`,
  BOOLEAN_FLAG: (flag: string) => `--${flag}`,
  USE_CONSTANT: `\\[\\[\\s*${TEMPLATE_ACTIONS.USE_CONSTANT}\\(([^)]+)\\)\\s*\\]\\]`,
  USE_FORM_DATA: `\\[\\[\\s*${TEMPLATE_ACTIONS.USE_FORM_DATA}\\(([^)]+)\\)\\s*\\]\\]`,
  USE_USER_ENV: `\\[\\[\\s*${TEMPLATE_ACTIONS.USE_USER_ENV}\\(([^)]+)\\)\\s*\\]\\]`,
  USE_TEMPLATE: `\\[\\[\\s*${TEMPLATE_ACTIONS.USE_TEMPLATE}\\(([^)]+)\\)\\s*\\]\\]`,
  FOLDER_PATH: '^\\/(.*?)$',
  RECURSIVE_WILDCARD_PATH: '^\\/(.*(\\*\\*).*)$',
} as const;

export const LOOP_TABLES_REGEX = new RegExp(
  `\\[\\[${TEMPLATE_ACTIONS.LOOP_TABLES.replace('(', '\\(').replace(')', '\\)')}(\\s+.*)\\]\\]`,
  'g',
);

export const LOOP_COLUMNS_REGEX = new RegExp(
  `\\[\\[${TEMPLATE_ACTIONS.LOOP_COLUMNS.replace('(', '\\(').replace(')', '\\)')}(\\s+.*)\\]\\]`,
  'g',
);

export const LOOP_COMMAND_REGEX = new RegExp(
  `${TEMPLATE_ACTIONS.LOOP}\\((.*?)\\)(.*)$`,
);

export const TEMPLATE_MATCH_REGEX = new RegExp(
  REGEX_PATTERNS.TEMPLATE_OPTION(ACTION_FLAGS.TEMPLATE),
);

export const SEPARATOR_MATCH_REGEX = new RegExp(
  REGEX_PATTERNS.TEMPLATE_OPTION(TEMPLATE_OPTIONS.SEPARATOR),
);

export const FILTER_MATCH_REGEX = new RegExp(
  REGEX_PATTERNS.TEMPLATE_OPTION(TEMPLATE_OPTIONS.FILTER),
);

export const IGNORE_MATCH_REGEX = new RegExp(
  REGEX_PATTERNS.TEMPLATE_OPTION(TEMPLATE_OPTIONS.IGNORE),
);

export const INCLUDE_FILES_MATCH_REGEX = new RegExp(
  REGEX_PATTERNS.TEMPLATE_OPTION(TEMPLATE_OPTIONS.INCLUDE_FILES),
);

export const EXCLUDE_FILES_MATCH_REGEX = new RegExp(
  REGEX_PATTERNS.TEMPLATE_OPTION(TEMPLATE_OPTIONS.EXCLUDE_FILES),
);

export const REMOVE_DUPLICATES_REGEX = new RegExp(
  REGEX_PATTERNS.BOOLEAN_FLAG(TEMPLATE_OPTIONS.REMOVE_DUPLICATES),
);

export const USE_CONSTANT_REGEX = new RegExp(REGEX_PATTERNS.USE_CONSTANT);

export const USE_FORM_DATA_REGEX = new RegExp(REGEX_PATTERNS.USE_FORM_DATA);

export const USE_USER_ENV_REGEX = new RegExp(REGEX_PATTERNS.USE_USER_ENV);

export const USE_TEMPLATE_REGEX = new RegExp(REGEX_PATTERNS.USE_TEMPLATE);

export const FOLDER_PATH_REGEX = new RegExp(REGEX_PATTERNS.FOLDER_PATH);

export const RECURSIVE_WILDCARD_REGEX = new RegExp(
  REGEX_PATTERNS.RECURSIVE_WILDCARD_PATH,
);
