import { ACTION_FLAGS } from '@/utils/project-builder/constants/actionFlags.ts';

const ITERATE = 'ITERATE';

export const TEMPLATE_ACTIONS = {
  ITERATE,
  USE_CONSTANT: 'USE_CONSTANT',
  ITERATE_TABLES: `${ITERATE}(tables)`,
  ITERATE_COLUMNS: `${ITERATE}(columns)`,
} as const;

export type ProjectAction =
  (typeof TEMPLATE_ACTIONS)[keyof typeof TEMPLATE_ACTIONS];

export const ITERATE_TABLES_REGEX = new RegExp(
  `\\[\\[${TEMPLATE_ACTIONS.ITERATE_TABLES.replace('(', '\\(').replace(')', '\\)')}\\s+--${ACTION_FLAGS.TEMPLATE}="([^"]+)"\\]\\]`,
  'g',
);

export const ITERATE_COLUMNS_REGEX = new RegExp(
  `\\[\\[${TEMPLATE_ACTIONS.ITERATE_COLUMNS.replace('(', '\\(').replace(')', '\\)')}\\s+--${ACTION_FLAGS.TEMPLATE}="([^"]+)"\\]\\]`,
  'g',
);

// New regex for the iterate command with more flexibility
export const ITERATE_COMMAND_REGEX = new RegExp(
  `${TEMPLATE_ACTIONS.ITERATE}\\((.*?)(?:\\)(\\s*.*))?$`,
);

// Template match regex for extracting template from options
export const TEMPLATE_MATCH_REGEX = new RegExp(`--${ACTION_FLAGS.TEMPLATE}="([^"]+)"`);

// Separator match regex for extracting separator from options
export const SEPARATOR_MATCH_REGEX = /--separator="([^"]+)"/;

// Filter match regex for extracting filter from options
export const FILTER_MATCH_REGEX = /--filter="([^"]+)"/;

// Ignore match regex for extracting ignore list from options
export const IGNORE_MATCH_REGEX = /--ignore="([^"]+)"/;

// Include files match regex for extracting files to include
export const INCLUDE_FILES_MATCH_REGEX = /--include-files="([^"]+)"/;

// Exclude files match regex for extracting files to exclude
export const EXCLUDE_FILES_MATCH_REGEX = /--exclude-files="([^"]+)"/;
