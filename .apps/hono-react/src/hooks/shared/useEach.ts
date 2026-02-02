import { axiosInstance } from '@/vendor/axiosInstance.ts';
import { handleError } from './handleError.ts';

/**
 * Process records in batches with a callback function
 * @param endpoint The API endpoint for each processing
 * @param callback Function to execute for each record
 * @param batchSize Number of records to process per batch
 * @param filters Optional filters to apply
 * @returns Promise that resolves when all records are processed
 */
export const eachResource = async <T>(
  endpoint: string,
  callback: (item: T) => void | Promise<void>,
  batchSize = 100,
  filters?: Record<string, unknown>,
): Promise<void> => {
  try {
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await axiosInstance.post(endpoint, {
        batchSize,
        offset,
        filters,
      });

      const items: T[] = response.data.data;

      if (items.length === 0) {
        hasMore = false;
        break;
      }

      for (const item of items) {
        await callback(item);
      }

      offset += batchSize;
      hasMore = items.length === batchSize;
    }
  } catch (error: unknown) {
    handleError(error, 'Failed to process resources with each');
  }
};