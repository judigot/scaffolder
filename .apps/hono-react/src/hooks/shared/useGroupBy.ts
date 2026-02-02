import { axiosInstance } from '@/vendor/axiosInstance.ts';
import { handleError } from './handleError.ts';

interface IGroupByResult {
  [key: string]: unknown;
  count?: number;
  sum?: number;
  avg?: number;
  min?: unknown;
  max?: unknown;
}

/**
 * Group records by specific column
 * @param endpoint The API endpoint for grouping
 * @param column The column to group by
 * @param aggregateFunction Optional aggregate function to apply
 * @param aggregateColumn Optional column to aggregate on
 * @param filters Optional filters to apply
 * @returns Promise resolving to an array of grouped results
 */
export const groupByResources = async (
  endpoint: string,
  column: string,
  aggregateFunction?: 'count' | 'sum' | 'avg' | 'min' | 'max',
  aggregateColumn?: string,
  filters?: Record<string, unknown>,
): Promise<IGroupByResult[]> => {
  try {
    const response = await axiosInstance.post(endpoint, {
      column,
      aggregateFunction,
      aggregateColumn,
      filters,
    });
    return response.data.data;
  } catch (error: unknown) {
    handleError(error, 'Failed to group resources');
  }
};