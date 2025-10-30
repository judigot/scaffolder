import type { IStructure } from '@/components/FileViewer.tsx';
import { type Zippable, zipSync } from 'fflate';

/**
 * Converts an IStructure (folder structure) to a binary ZIP file and triggers a download
 *
 * @param structure - The IStructure to convert to a ZIP file
 * @param zipFileName - The name of the ZIP file to download (default: 'project-files.zip')
 * @returns Promise that resolves when the download is complete
 */
export const zipAndDownloadIStructure = (
  structure: IStructure,
  zipFileName = 'project-files.zip',
): void => {
  try {
    // Create a Zippable object to store files and directories
    const zipContent: Zippable = {};

    // Process the structure recursively
    processStructure(structure, '', zipContent);

    // Create a ZIP file from the content
    const zipData = zipSync(zipContent, {
      level: 6, // Compression level (0-9, where 9 is highest compression)
    });

    // Convert to Blob for download
    const blob = new Blob([zipData], { type: 'application/zip' });

    // Create a download link
    const downloadUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = downloadUrl;
    downloadLink.download = zipFileName;

    // Trigger the download
    document.body.appendChild(downloadLink);
    downloadLink.click();

    // Clean up
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Error creating ZIP file:', error);
    throw new Error(`Failed to create ZIP file: ${String(error)}`);
  }
};

/**
 * Recursively processes an IStructure to add files and folders to a Zippable object
 *
 * @param structure - The IStructure to process
 * @param currentPath - The current path in the ZIP structure
 * @param zipContent - The Zippable object to add content to
 */
function processStructure(
  structure: IStructure,
  currentPath: string,
  zipContent: Zippable,
): void {
  structure.forEach((item) => {
    const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name;

    if (item.type === 'file') {
      // Add file content to the ZIP
      zipContent[itemPath] = new TextEncoder().encode(item.content);
    } else {
      // Process the folder's children recursively
      processStructure(item.children, itemPath, zipContent);
    }
  });
}

export default zipAndDownloadIStructure;
