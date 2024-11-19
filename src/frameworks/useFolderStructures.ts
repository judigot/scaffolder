import { IStructure } from '@/components/FileViewer';
import { ISchemaInfo } from '@/interfaces/interfaces';
import { frameworks } from '@/useFormStore';
import { useLaravel as laravelFolderStructure } from '@/utils/backend/laravel/useLaravel';
import { useNextJS as nextjsFolderStructure } from '@/utils/backend/nextjs/useNextJS';

export function useFolderStructures(
  schemaInfo: ISchemaInfo[],
): Record<string, IStructure> {
  return {
    [frameworks.LARAVEL]: laravelFolderStructure({ schemaInfo }),
    [frameworks.NEXTJS]: nextjsFolderStructure({ schemaInfo }),
  };
}
