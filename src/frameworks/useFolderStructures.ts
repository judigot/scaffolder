import { IStructure } from '@/components/FileViewer.tsx';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { frameworks } from '@/useFormStore.ts';
import { useLaravel } from '@/frameworks/backend/laravel/useLaravel.ts';
import { useNextJS } from '@/frameworks/backend/nextjs/useNextJS.ts';
import { useFrontend } from '@/frameworks/frontend/useFrontend.ts';

export function useFolderStructures(
  schemaInfo: ISchemaInfo[],
): Record<string, IStructure> {
  return {
    [frameworks.LARAVEL]: useLaravel({ schemaInfo }),
    [frameworks.NEXTJS]: useNextJS({ schemaInfo }),
    frontend: useFrontend({ schemaInfo }),
  };
}
