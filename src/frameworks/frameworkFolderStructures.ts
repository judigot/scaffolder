import { IStructure } from '@/components/FileViewer';
import { ISchemaInfo } from '@/interfaces/interfaces';
import { frameworks } from '@/useFormStore';
import { folderStructure as laravelFolderStructure } from '@/utils/backend/laravel/folderStructure';
import { folderStructure as nextjsFolderStructure } from '@/utils/backend/nextjs/folderStructure';

export function frameworkFolderStructures(
  schemaInfo: ISchemaInfo[],
): Record<string, IStructure> {
  return {
    [frameworks.LARAVEL]: laravelFolderStructure({ schemaInfo }),
    [frameworks.NEXTJS]: nextjsFolderStructure({ schemaInfo }),
  };
}
