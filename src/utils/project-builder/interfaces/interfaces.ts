export type ReplacementValue = string | string[];
export type Replacements = Record<string, ReplacementValue>;

export interface ICommandOptions {
  conditions?: string[];
  template?: string;
  includeTable?: string;
  scoped?: boolean;
  excludeTable?: string;
}
