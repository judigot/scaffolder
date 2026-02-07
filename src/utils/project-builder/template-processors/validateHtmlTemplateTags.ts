// Utility for validating HTML-like template tags used across project templates.
const VALIDATE_TAGS = {
  if: { open: '<@@IF@@', close: '</@@IF@@>' },
  loop: { open: '<@@LOOP@@', close: '</@@LOOP@@>' },
} as const;

export const validateHtmlTemplateTags = (
  content: string,
  context?: string,
): void => {
  const ifOpens = (content.match(new RegExp(VALIDATE_TAGS.if.open, 'g')) ?? [])
    .length;
  const ifCloses = (
    content.match(new RegExp(VALIDATE_TAGS.if.close, 'g')) ?? []
  ).length;
  const loopOpens = (
    content.match(new RegExp(VALIDATE_TAGS.loop.open, 'g')) ?? []
  ).length;
  const loopCloses = (
    content.match(new RegExp(VALIDATE_TAGS.loop.close, 'g')) ?? []
  ).length;

  const errors: string[] = [];

  if (ifOpens !== ifCloses) {
    errors.push(
      `${VALIDATE_TAGS.if.open}: ${String(ifOpens)} opens, ${String(ifCloses)} closes`,
    );
  }
  if (loopOpens !== loopCloses) {
    errors.push(
      `${VALIDATE_TAGS.loop.open}: ${String(loopOpens)} opens, ${String(loopCloses)} closes`,
    );
  }

  if (errors.length > 0) {
    const hasContext = context !== undefined && context !== '';
    const contextInfo = hasContext ? ` in "${context}"` : '';
    throw new Error(
      `Unbalanced template tags${contextInfo}:\n  ${errors.join('\n  ')}\nUse balanced <@@IF@@>...</@@IF@@> and <@@LOOP@@>...</@@LOOP@@> blocks.`,
    );
  }
};
