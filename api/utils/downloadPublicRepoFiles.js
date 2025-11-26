import { unzipSync, strFromU8 } from 'fflate';
import { isBinaryFile } from '../utils/binaryFileUtils';
// Note: This function only works for public repositories.
// GitHub ZIP archives are accessible without authentication for public repos.
// Private repositories would require authenticated API calls or custom handling.
export async function fetchRepositoryFiles(options) {
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
  const isEntryMatching = (entryName) => {
    if (fetchAllFiles) {
      return true;
    }
    return filesToFetch.some((pattern) => {
      const targetPath = `${rootFolderPrefix}${pattern}`;
      return entryName === targetPath || entryName.startsWith(`${targetPath}/`);
    });
  };
  const files = Object.entries(extractedEntries)
    .filter(
      ([entryName]) => !entryName.endsWith('/') && isEntryMatching(entryName),
    )
    .map(([entryName, fileContent]) => {
      const cleanedPath = entryName.replace(rootFolderPrefix, '');
      const finalFilePath = keepFolderStructure
        ? cleanedPath
        : (cleanedPath.split('/').pop() ?? cleanedPath);
      const binary = isBinaryFile(finalFilePath);
      if (binary) {
        const base64Content = Buffer.from(fileContent).toString('base64');
        return {
          path: finalFilePath,
          content: base64Content,
          isBinary: true,
        };
      }
      return {
        path: finalFilePath,
        content: strFromU8(fileContent),
        isBinary: false,
      };
    });
  return files;
}
