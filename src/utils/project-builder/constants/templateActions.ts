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
