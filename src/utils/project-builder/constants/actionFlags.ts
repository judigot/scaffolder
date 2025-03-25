export const ACTION_FLAGS = {
  ITERATE: 'conditions',
  TEMPLATE: 'template',
  USE_RELATED_TABLE: 'scoped',
  INCLUDE_TABLE: 'include-table',
  EXCLUDE_TABLE: 'exclude-table',
} as const;

export type ProjectActionFlag = (typeof ACTION_FLAGS)[keyof typeof ACTION_FLAGS];
