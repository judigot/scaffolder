export type ScaffolderSeverity = 'error' | 'warning' | 'info';

export interface IScaffolderMessage {
  id: string;
  code: string;
  title: string;
  severity: ScaffolderSeverity;
  details?: string[];
  suggestion?: string;
  file?: string;
  line?: number;
  timestamp: string;
  dismissible: boolean;
}
