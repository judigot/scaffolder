export const PROJECT_ACTIONS = {
  CREATE_FILE: 'CREATE_FILE',
  FILE_LOOP: 'FILE_LOOP',
  FOLDER_LOOP: 'FOLDER_LOOP',
  IMPORT_PROJECT: 'IMPORT_PROJECT',
} as const;

export type ProjectAction =
  (typeof PROJECT_ACTIONS)[keyof typeof PROJECT_ACTIONS];
