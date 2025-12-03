import type { BuildContext, DataContext } from '../interfaces/interfaces.ts';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';

/**
 * Helper functions for working with BuildContext.
 * Use these to create modified contexts for child operations.
 */

/**
 * Create a new context with a different table
 */
export const withTable = (
  ctx: BuildContext,
  table: ISchemaInfo,
): BuildContext => ({
  ...ctx,
  table,
});

/**
 * Create a new context with a different path
 */
export const withPath = (
  ctx: BuildContext,
  currentPath: string,
): BuildContext => ({
  ...ctx,
  currentPath,
});

/**
 * Create a new context with a different data context
 */
export const withDataContext = (
  ctx: BuildContext,
  dataContext: DataContext,
): BuildContext => ({
  ...ctx,
  dataContext,
});

/**
 * Create a new context with multiple modifications
 */
export const withUpdates = (
  ctx: BuildContext,
  updates: Partial<BuildContext>,
): BuildContext => ({
  ...ctx,
  ...updates,
});
