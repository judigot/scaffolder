import type { IStructure, IFolder } from '@/components/FileViewer.tsx';

export const findProjectsFolderAtRoot = (
  userFiles: IStructure,
): IFolder | undefined => {
  return userFiles.find(
    (item): item is IFolder =>
      item.name === 'Projects' && item.type === 'folder',
  );
};
