import { Router, Request, Response } from 'express';
import { fetchRepositoryFiles } from '@/utils/downloadPublicRepoFiles.ts';
import { convertPublicRepoFilesToStructure } from '@/utils/convertPublicRepoFilesToIStructure.ts';

/**
 * Route that fetches files from a public GitHub repository and returns them in a structured format
 * 
 * This implementation:
 * 1. Downloads files from the judigot/scaffolder-files GitHub repository
 * 2. Extracts and processes the ZIP archive in memory
 * 3. Converts the flat file list to a nested folder structure
 * 4. Returns the structured data to the frontend
 * 
 * This approach resolves CORS issues by handling the GitHub API requests
 * server-side rather than from the browser.
 */
const router = Router();

router.get(
  '/getUserFilesFromPublicRepo',
  async (_req: Request, res: Response) => {
    try {
      // Fetch repository files from GitHub (server-to-server request not subject to CORS)
      const extractedFiles = await fetchRepositoryFiles({
        user: 'judigot',
        repository: 'scaffolder-files',
        branch: 'main',
        filesToFetch: ['*'],
        keepFolderStructure: true,
      });

      // Convert the extracted files to the expected IStructure format
      const result = convertPublicRepoFilesToStructure(extractedFiles);
      
      // Return the structured data as JSON
      res.json(result);
    } catch (error) {
      // Handle errors with appropriate status code and message
      console.error('Error fetching repository files:', error);
      res.status(500).json({
        error: 'Failed to fetch repository files',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  },
);

export default router; 