const warnedLegacySyntax = new Set<string>();

const buildWarningKey = (syntax: string, templateFilePath?: string): string => {
  return `${templateFilePath ?? '<inline>'}:${syntax}`;
};

const warnOnce = (
  syntax: string,
  recommendation: string,
  templateFilePath?: string,
): void => {
  const key = buildWarningKey(syntax, templateFilePath);
  if (warnedLegacySyntax.has(key)) {
    return;
  }

  warnedLegacySyntax.add(key);
  const hasTemplatePath =
    templateFilePath !== undefined && templateFilePath !== '';
  const location = hasTemplatePath ? ` in template "${templateFilePath}"` : '';
  console.warn(
    `[project-builder] Deprecated DSL syntax detected${location}: ${syntax}. ${recommendation}`,
  );
};

export const emitLegacyDslWarnings = (
  content: string,
  templateFilePath?: string,
): void => {
  if (/\[\[\s*LOOP\(/.test(content) || /\[\[\s*\/LOOP/.test(content)) {
    warnOnce(
      '[[LOOP(...)]] / [[/LOOP]]',
      'Use <@@LOOP@@ data="...">...</@@LOOP@@> instead.',
      templateFilePath,
    );
  }

  if (/@LOOP\(|@\/LOOP/.test(content)) {
    warnOnce(
      '@LOOP(...) / @/LOOP',
      'Use <@@LOOP@@ data="...">...</@@LOOP@@> instead.',
      templateFilePath,
    );
  }

  if (/\[\[\s*USE_DATA\(/.test(content)) {
    warnOnce(
      '[[USE_DATA(path)]]',
      'Use <@@>data.path</@@> placeholders instead.',
      templateFilePath,
    );
  }

  if (/\{\{[^}]+\}\}/.test(content)) {
    warnOnce(
      '{{placeholder}}',
      'Use <@@>placeholder</@@> placeholders instead.',
      templateFilePath,
    );
  }
};

export const __clearLegacyDslWarningsForTests = (): void => {
  warnedLegacySyntax.clear();
};
