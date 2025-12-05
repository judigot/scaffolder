import { Hono } from 'hono';
import * as fs from 'fs';
import * as path from 'path';

const router = new Hono();

interface IDeleteLocalFileBody {
  filePath?: unknown;
}

const isDeleteLocalFileBody = (val: unknown): val is IDeleteLocalFileBody => {
  return typeof val === 'object' && val !== null;
};

router.post('/', async (c) => {
  const body = await c.req.json<IDeleteLocalFileBody>();

  if (!isDeleteLocalFileBody(body)) {
    return c.json(
      {
        error: 'Invalid request body',
        message: 'Request body must be an object',
      },
      400,
    );
  }

  const { filePath } = body;

  if (typeof filePath !== 'string' || filePath === '') {
    return c.json(
      {
        error: 'Missing required fields',
        message: 'filePath is required',
      },
      400,
    );
  }

  /* Security: Prevent path traversal attacks */
  const normalizedPath = path
    .normalize(filePath)
    .replace(/^(\.\.(\/|\\|$))+/, '');
  const basePath = 'src/files';
  const fullPath = path.join(basePath, normalizedPath);

  /* Ensure the path is within the allowed directory */
  const resolvedBasePath = path.resolve(basePath);
  const resolvedFullPath = path.resolve(fullPath);

  if (!resolvedFullPath.startsWith(resolvedBasePath)) {
    return c.json(
      {
        error: 'Invalid file path',
        message: 'File path must be within the src/files directory',
      },
      400,
    );
  }

  try {
    /* Check if file exists */
    if (!fs.existsSync(resolvedFullPath)) {
      return c.json(
        {
          error: 'File not found',
          message: `File does not exist: ${normalizedPath}`,
        },
        404,
      );
    }

    /* Delete the file */
    fs.unlinkSync(resolvedFullPath);

    return c.json({
      success: true,
      message: 'File deleted successfully',
      filePath: normalizedPath,
    });
  } catch (error) {
    if (error instanceof Error) {
      return c.json({ error: `Failed to delete file: ${error.message}` }, 500);
    }
    return c.json({ error: 'Failed to delete file: Unknown error' }, 500);
  }
});

export default router;
