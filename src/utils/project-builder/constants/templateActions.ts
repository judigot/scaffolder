export const TEMPLATE_ACTIONS = {
  ITERATE: 'ITERATE',
  USE_CONSTANT: 'USE_CONSTANT',
} as const;

export type ProjectAction =
  (typeof TEMPLATE_ACTIONS)[keyof typeof TEMPLATE_ACTIONS];
