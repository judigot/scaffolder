import { IStructure } from '@/components/FileViewer.tsx';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { frameworks } from '@/useFormStore.ts';
import { useLaravel } from '@/frameworks/backend/laravel/useLaravel.ts';
import { useNextJS } from '@/frameworks/backend/nextjs/useNextJS.ts';
import { useFrontend } from '@/frameworks/frontend/useFrontend.ts';

export function getFolderStructures(
  schemaInfo: ISchemaInfo[],
): Record<string, IStructure> {
  return {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    [frameworks.LARAVEL]: useLaravel({ schemaInfo }),
    // eslint-disable-next-line react-hooks/rules-of-hooks
    [frameworks.NEXTJS]: useNextJS({ schemaInfo }),
    // eslint-disable-next-line react-hooks/rules-of-hooks
    frontend: useFrontend({ schemaInfo }),
  };
}

// Keep the old name for backward compatibility with React components
export const useFolderStructures = getFolderStructures;
