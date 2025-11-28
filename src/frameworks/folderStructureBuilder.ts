import type { IStructure } from '@/components/FileViewer.tsx';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { frameworks, type IFormStore } from '@/useFormStore.ts';
import { useLaravel } from '@/frameworks/backend/laravel/useLaravel.ts';
import { useNextJS } from '@/frameworks/backend/nextjs/useNextJS.ts';
import { useFrontend } from '@/frameworks/frontend/useFrontend.ts';

export function getFolderStructures({
  schemaInfo,
  formData,
}: {
  schemaInfo: ISchemaInfo[];
  formData: IFormStore;
}): Record<string, IStructure> {
  return {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    [frameworks.LARAVEL]: useLaravel({ schemaInfo }),
    // eslint-disable-next-line react-hooks/rules-of-hooks
    [frameworks.NEXTJS]: useNextJS({ schemaInfo }),
    // eslint-disable-next-line react-hooks/rules-of-hooks
    frontend: useFrontend({
      schemaInfo,
      includeTypeGuards: formData.includeTypeGuards,
      outputOnSingleFile: formData.outputOnSingleFile,
    }),
  };
}

// Keep the old name for backward compatibility with React components
export const folderStructureBuilder = getFolderStructures;
