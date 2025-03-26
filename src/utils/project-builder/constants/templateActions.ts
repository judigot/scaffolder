import { ACTION_FLAGS } from '@/utils/project-builder/constants/actionFlags.ts';

const LOOP = 'LOOP';

export const TEMPLATE_ACTIONS = {
  LOOP,
  USE_CONSTANT: 'USE_CONSTANT',
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
  TEMPLATE_OPTION: (flag: string) => `--${flag}="([^"]+)"`,
  BOOLEAN_FLAG: (flag: string) => `--${flag}`,
  USE_CONSTANT: '\\[\\[\\s*USE_CONSTANT\\(([^)]+)\\)\\s*\\]\\]',
  FOLDER_PATH: '^\\/(.*?)$',
} as const;

export const LOOP_TABLES_REGEX = new RegExp(
  `\\[\\[${TEMPLATE_ACTIONS.LOOP_TABLES.replace('(', '\\(').replace(')', '\\)')}\\s+--${ACTION_FLAGS.TEMPLATE}="([^"]+)"\\]\\]`,
  'g',
);

export const LOOP_COLUMNS_REGEX = new RegExp(
  `\\[\\[${TEMPLATE_ACTIONS.LOOP_COLUMNS.replace('(', '\\(').replace(')', '\\)')}\\s+--${ACTION_FLAGS.TEMPLATE}="([^"]+)"\\]\\]`,
  'g',
);

// New regex for the iterate command with more flexibility
export const LOOP_COMMAND_REGEX = new RegExp(
  `${TEMPLATE_ACTIONS.LOOP}\\((.*?)(?:\\)(\\s*.*))?$`,
);

// Template match regex for extracting template from options
export const TEMPLATE_MATCH_REGEX = new RegExp(
  REGEX_PATTERNS.TEMPLATE_OPTION(ACTION_FLAGS.TEMPLATE),
);

// Separator match regex for extracting separator from options
export const SEPARATOR_MATCH_REGEX = new RegExp(
  REGEX_PATTERNS.TEMPLATE_OPTION(TEMPLATE_OPTIONS.SEPARATOR),
);

// Filter match regex for extracting filter from options
export const FILTER_MATCH_REGEX = new RegExp(
  REGEX_PATTERNS.TEMPLATE_OPTION(TEMPLATE_OPTIONS.FILTER),
);

// Ignore match regex for extracting ignore list from options
export const IGNORE_MATCH_REGEX = new RegExp(
  REGEX_PATTERNS.TEMPLATE_OPTION(TEMPLATE_OPTIONS.IGNORE),
);

// Include files match regex for extracting files to include
export const INCLUDE_FILES_MATCH_REGEX = new RegExp(
  REGEX_PATTERNS.TEMPLATE_OPTION(TEMPLATE_OPTIONS.INCLUDE_FILES),
);

// Exclude files match regex for extracting files to exclude
export const EXCLUDE_FILES_MATCH_REGEX = new RegExp(
  REGEX_PATTERNS.TEMPLATE_OPTION(TEMPLATE_OPTIONS.EXCLUDE_FILES),
);

// Remove duplicates flag regex
export const REMOVE_DUPLICATES_REGEX = new RegExp(
  REGEX_PATTERNS.BOOLEAN_FLAG(TEMPLATE_OPTIONS.REMOVE_DUPLICATES),
);

// USE_CONSTANT regex for extracting constant references
export const USE_CONSTANT_REGEX = new RegExp(REGEX_PATTERNS.USE_CONSTANT);

// Folder path regex for directory navigation
export const FOLDER_PATH_REGEX = new RegExp(REGEX_PATTERNS.FOLDER_PATH);
