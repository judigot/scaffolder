import type { IStructure, IFile, IFolder } from '@/components/FileViewer.tsx';
import type { IFileMetadata } from '@/utils/githubApiUtils.ts';

export function convertMetadataToIStructure(
  metadata: IFileMetadata[],
): IStructure {
  const root: IFolder = { name: '', type: 'folder', children: [] };

  for (const item of metadata) {
    const parts = item.path.split('/');
    let currentFolder: IFolder = root;

    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      const isLast = index === parts.length - 1;

      if (isLast) {
        if (item.type === 'file') {
          const file: IFile = {
            name: part,
            type: 'file',
            content: '',
            filePath: item.path,
          };
          currentFolder.children.push(file);
        } else {
          const folder: IFolder = {
            name: part,
            type: 'folder',
            children: [],
          };
          currentFolder.children.push(folder);
        }
      } else {
        const existingFolderCandidate = currentFolder.children.find(
          (child) => child.type === 'folder' && child.name === part,
        );

        if (existingFolderCandidate?.type === 'folder') {
          currentFolder = existingFolderCandidate;
        } else {
          const newFolder: IFolder = {
            name: part,
            type: 'folder',
            children: [],
          };
          currentFolder.children.push(newFolder);
          currentFolder = newFolder;
        }
      }
    }
  }

  return root.children;
}
