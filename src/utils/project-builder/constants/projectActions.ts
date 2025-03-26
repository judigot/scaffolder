export const PROJECT_ACTIONS = {
  CREATE_FILE: 'CREATE_FILE',
  FILE_LOOP: 'FILE_LOOP',
  FOR_EACH_TABLE: 'FOR_EACH_TABLE',
  IMPORT_PROJECT: 'IMPORT_PROJECT',
} as const;

export type ProjectAction =
  (typeof PROJECT_ACTIONS)[keyof typeof PROJECT_ACTIONS];
