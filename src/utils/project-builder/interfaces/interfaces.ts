export type ReplacementValue = string | string[];
export type Replacements = Record<string, ReplacementValue>;

export interface ICommandOptions {
  conditions?: string[];
  template?: string;
  modelSpecificRoutes?: string;
  baseRoutesForController?: string;
  relatedFiles?: string[];
  includeTable?: string;
  useRelatedTable?: boolean;
  excludeTable?: string;
}
