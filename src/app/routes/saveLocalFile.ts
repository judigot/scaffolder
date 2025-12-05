import { Hono } from 'hono';
import * as fs from 'fs';
import * as path from 'path';

const router = new Hono();

interface ISaveLocalFileBody {
  filePath?: unknown;
  content?: unknown;
}

const isSaveLocalFileBody = (val: unknown): val is ISaveLocalFileBody => {
  return typeof val === 'object' && val !== null;
};

router.post('/', async (c) => {
  const body = await c.req.json<ISaveLocalFileBody>();

  if (!isSaveLocalFileBody(body)) {
    return c.json(
      {
        error: 'Invalid request body',
        message: 'Request body must be an object',
      },
      400,
    );
  }

  const { filePath, content } = body;

  if (
    typeof filePath !== 'string' ||
    filePath === '' ||
    typeof content !== 'string'
  ) {
    return c.json(
      {
        error: 'Missing required fields',
        message: 'filePath and content are required',
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
    /* Ensure directory exists */
    const directory = path.dirname(resolvedFullPath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    /* Write the file */
    fs.writeFileSync(resolvedFullPath, content, 'utf-8');

    return c.json({
      success: true,
      message: 'File saved successfully',
      filePath: normalizedPath,
    });
  } catch (error) {
    if (error instanceof Error) {
      return c.json({ error: `Failed to save file: ${error.message}` }, 500);
    }
    return c.json({ error: 'Failed to save file: Unknown error' }, 500);
  }
});

export default router;
