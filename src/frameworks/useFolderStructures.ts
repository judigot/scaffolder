import { IStructure } from '@/components/FileViewer';
import { ISchemaInfo } from '@/interfaces/interfaces';
import { frameworks } from '@/useFormStore';
import { useLaravel } from '@/frameworks/backend/laravel/useLaravel';
import { useNextJS } from '@/frameworks/backend/nextjs/useNextJS';

export function useFolderStructures(
  schemaInfo: ISchemaInfo[],
): Record<string, IStructure> {
  return {
    [frameworks.LARAVEL]: useLaravel({ schemaInfo }),
    [frameworks.NEXTJS]: useNextJS({ schemaInfo }),
  };
}
