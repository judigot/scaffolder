export type ScaffolderSeverity = 'error' | 'warning' | 'info';

export const SCAFFOLDER_MESSAGE_CODES = {
  CircularImport: 'CIRCULAR_IMPORT',
  CircularPlaceholder: 'CIRCULAR_PLACEHOLDER',
  FileNotFound: 'FILE_NOT_FOUND',
  FormatError: 'FORMAT_ERROR',
  InvalidYaml: 'INVALID_YAML',
  LeftoverPlaceholder: 'LEFTOVER_PLACEHOLDER',
  TemplateApiConflict: 'TEMPLATE_API_CONFLICT',
  UserEnvUsage: 'USER_ENV_USAGE',
} satisfies Record<string, string>;

export type ScaffolderMessageCode =
  (typeof SCAFFOLDER_MESSAGE_CODES)[keyof typeof SCAFFOLDER_MESSAGE_CODES];

export interface IScaffolderMessage {
  id: string;
  code: ScaffolderMessageCode;
  title: string;
  severity: ScaffolderSeverity;
  details?: string[];
  suggestion?: string;
  file?: string;
  line?: number;
  timestamp: string;
  dismissible: boolean;
}
