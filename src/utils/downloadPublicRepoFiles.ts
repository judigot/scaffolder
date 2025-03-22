import { unzipSync, strFromU8 } from 'fflate';

export interface IExtractedFile {
  path: string;
  content: string;
}

interface IFetchRepoOptions {
  user: string;
  repository: string;
  branch: string;
  filesToFetch: string[]; // Examples: ['.bashrc', 'src'] or ['*']
  keepFolderStructure?: boolean;
}

// Note: This function only works for public repositories.
// GitHub ZIP archives are accessible without authentication for public repos.
// Private repositories would require authenticated API calls or custom handling.
export async function fetchRepositoryFiles(
  options: IFetchRepoOptions,
): Promise<IExtractedFile[]> {
  const {
    user,
    repository,
    branch,
    filesToFetch,
    keepFolderStructure = true,
  } = options;

  const zipDownloadUrl = `https://github.com/${user}/${repository}/archive/refs/heads/${branch}.zip`;

  // Download the repository archive as a binary stream.
  const response = await fetch(zipDownloadUrl);
  const binaryData = await response.arrayBuffer();
  const zipContent = new Uint8Array(binaryData);

  // Extract files from the archive.
  const extractedEntries = unzipSync(zipContent);

  const rootFolderPrefix = `${repository}-${branch}/`;
  const fetchAllFiles = filesToFetch.length === 1 && filesToFetch[0] === '*';

  const isEntryMatching = (entryName: string): boolean => {
    if (fetchAllFiles) {
      return true;
    }

    return filesToFetch.some((pattern) => {
      const targetPath = `${rootFolderPrefix}${pattern}`;
      return entryName === targetPath || entryName.startsWith(`${targetPath}/`);
    });
  };

  const files: IExtractedFile[] = Object.entries(extractedEntries)
    .filter(
      ([entryName]) => !entryName.endsWith('/') && isEntryMatching(entryName),
    )
    .map(([entryName, fileContent]) => {
      const cleanedPath = entryName.replace(rootFolderPrefix, '');
      const finalFilePath = keepFolderStructure
        ? cleanedPath
        : (cleanedPath.split('/').pop() ?? cleanedPath);

      return {
        path: finalFilePath,
        content: strFromU8(fileContent),
      };
    });

  return files;
}
