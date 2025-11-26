export function convertPublicRepoFilesToStructure(files) {
  const root = { name: '', type: 'folder', children: [] };
  for (const file of files) {
    const parts = file.path.split('/');
    let currentFolder = root;
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      const isLast = index === parts.length - 1;
      if (isLast) {
        currentFolder.children.push({
          name: part,
          type: 'file',
          content: file.content,
          isBinary: file.isBinary,
        });
      } else {
        const existingFolderCandidate = currentFolder.children.find(
          (child) => child.type === 'folder' && child.name === part,
        );
        if (existingFolderCandidate?.type === 'folder') {
          currentFolder = existingFolderCandidate;
        } else {
          const newFolder = {
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
