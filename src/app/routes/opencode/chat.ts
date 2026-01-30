import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
  buildOpencodeHeaders,
  getOpencodeConfig,
} from '@/app/services/opencodeService.ts';

interface IOpenCodeChatPayload {
  message?: unknown;
  sessionId?: unknown;
  directory?: unknown;
  systemPrompt?: unknown;
  model?: unknown;
}

interface IOpenCodePart {
  type: string;
  text?: string;
}

const app = new Hono();

app.use('*', cors());

async function createSession(
  baseUrl: string,
  headers: Headers,
  model?: string,
): Promise<string> {
  const sessionBody: { title: string; model?: string } = {
    title: 'Scaffolder OpenCode',
  };
  if (model !== undefined && model !== '') {
    sessionBody.model = model;
  }
  const response = await fetch(new URL('/session', baseUrl).toString(), {
    method: 'POST',
    headers,
    body: JSON.stringify(sessionBody),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Failed to create session (${String(response.status)}): ${text}`,
    );
  }

  const data: unknown = await response.json();
  if (
    typeof data !== 'object' ||
    data === null ||
    !('id' in data) ||
    typeof data.id !== 'string' ||
    data.id === ''
  ) {
    throw new Error('OpenCode session response missing id');
  }

  return data.id;
}

function extractAssistantText(parts: IOpenCodePart[] | undefined): string {
  if (parts === undefined || parts.length === 0) {
    return '';
  }

  return parts
    .filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text ?? '')
    .join('\n');
}

app.post('/', async (c) => {
  const configResult = getOpencodeConfig();
  if (!configResult.ok) {
    return c.json(
      {
        error: configResult.error,
      },
      { status: configResult.status },
    );
  }

  let body: IOpenCodeChatPayload;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  if (typeof body.message !== 'string' || body.message.trim() === '') {
    return c.json({ error: 'Message is required' }, 400);
  }

  const directory =
    typeof body.directory === 'string' ? body.directory : undefined;
  const systemPrompt =
    typeof body.systemPrompt === 'string' ? body.systemPrompt : undefined;
  const model = typeof body.model === 'string' ? body.model : undefined;
  const { config } = configResult;
  const headers = buildOpencodeHeaders(config, directory, model);
  const baseUrl = config.baseUrl;

  let sessionId =
    typeof body.sessionId === 'string' ? body.sessionId : undefined;

  try {
    if (sessionId === undefined || sessionId === '') {
      sessionId = await createSession(baseUrl, headers, model);
    }

    // body.message is already validated as string above
    const messageText = body.message;
    const promptBody: {
      parts: { type: string; text: string }[];
      system?: string;
      model?: { providerID: string; modelID: string };
    } = {
      parts: [{ type: 'text', text: messageText }],
    };

    if (systemPrompt !== undefined && systemPrompt !== '') {
      promptBody.system = systemPrompt;
    }

    // Parse model in format "provider/model" into separate providerID and modelID
    if (model !== undefined && model !== '' && model.includes('/')) {
      const [providerID, ...modelParts] = model.split('/');
      const modelID = modelParts.join('/');
      if (providerID !== '' && modelID !== '') {
        promptBody.model = { providerID, modelID };
      }
    }

    const promptResponse = await fetch(
      new URL(`/session/${sessionId}/message`, baseUrl).toString(),
      {
        method: 'POST',
        headers,
        body: JSON.stringify(promptBody),
      },
    );

    if (!promptResponse.ok) {
      const text = await promptResponse.text();
      return c.json(
        {
          error: `OpenCode prompt failed (${String(promptResponse.status)})`,
          details: text,
        },
        502,
      );
    }

    const responseData: unknown = await promptResponse.json();
    let assistantText = '';
    if (
      typeof responseData === 'object' &&
      responseData !== null &&
      'parts' in responseData
    ) {
      // eslint-disable-next-line no-type-assertion/no-type-assertion -- Safe after type guard
      const partsContainer = responseData as { parts: unknown };
      if (Array.isArray(partsContainer.parts)) {
        const parts = partsContainer.parts.filter((p): p is IOpenCodePart => {
          if (typeof p !== 'object' || p === null || !('type' in p)) {
            return false;
          }
          // eslint-disable-next-line no-type-assertion/no-type-assertion -- Safe after type guard
          const pObj = p as { type: unknown };
          return typeof pObj.type === 'string';
        });
        assistantText = extractAssistantText(parts);
      }
    }

    return c.json({
      sessionId,
      assistantText,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'OpenCode request failed';
    return c.json({ error: message }, 502);
  }
});

export default app;
