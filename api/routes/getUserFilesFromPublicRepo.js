import { Router } from 'express';
import { fetchRepositoryFiles } from '../utils/downloadPublicRepoFiles';
import { convertPublicRepoFilesToStructure } from '../utils/convertPublicRepoFilesToIStructure';
/**
 * Route that fetches files from a public GitHub repository and returns them in a structured format
 *
 * This implementation:
 * 1. Receives publicRepoURL from the frontend
 * 2. Parses the URL to extract user and repository
 * 3. Downloads files from the specified GitHub repository
 * 4. Extracts and processes the ZIP archive in memory
 * 5. Converts the flat file list to a nested folder structure
 * 6. Returns the structured data to the frontend
 *
 * This approach resolves CORS issues by handling the GitHub API requests
 * server-side rather than from the browser.
 */
const router = Router();
// Helper function to parse GitHub URL
function parseGitHubURL(url) {
  try {
    // Handle URLs like https://github.com/username/repository
    const githubRegex = /github\.com\/([^/]+)\/([^/]+)/;
    const match = githubRegex.exec(url);
    if (match?.length === 3) {
      return {
        user: match[1],
        repository: match[2],
      };
    }
    return null;
  } catch {
    // Ignore any errors and return null
    return null;
  }
}
router.post('/getUserFilesFromPublicRepo', async (req, res) => {
  try {
    // Extract and validate publicRepoURL from request body
    const { publicRepoURL } = req.body;
    if (typeof publicRepoURL !== 'string' || publicRepoURL === '') {
      res.status(400).json({
        error: 'Missing repository URL',
        message: 'Please provide a valid GitHub repository URL',
      });
      return;
    }
    // Parse the GitHub URL
    const repoInfo = parseGitHubURL(publicRepoURL);
    if (!repoInfo) {
      res.status(400).json({
        error: 'Invalid GitHub URL',
        message:
          'The provided URL is not a valid GitHub repository URL. Expected format: https://github.com/username/repository',
      });
      return;
    }
    // Fetch repository files from GitHub (server-to-server request not subject to CORS)
    const extractedFiles = await fetchRepositoryFiles({
      user: repoInfo.user,
      repository: repoInfo.repository,
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
    res.status(500).json({
      error: 'Failed to fetch repository files',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});
export default router;
