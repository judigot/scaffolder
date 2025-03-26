export const ACTION_FLAGS = {
  CONDITIONS: 'conditions',
  TEMPLATE: 'template',
  SCOPED: 'scoped',
  INCLUDE_TABLE: 'include-table',
  EXCLUDE_TABLE: 'exclude-table',
} as const;

export type ProjectActionFlag = (typeof ACTION_FLAGS)[keyof typeof ACTION_FLAGS];
