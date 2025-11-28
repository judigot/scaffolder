import type { IRouteContext } from './types.ts';
import convertLocalFilesToIStructure from '@/utils/convertLocalFilesToIStructure.ts';

export const getUserFilesHandler = (c: IRouteContext) => {
  const result = convertLocalFilesToIStructure('src/files');
  return c.json(result);
};
