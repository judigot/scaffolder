import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import {
  buildOpencodeHeaders,
  getOpencodeConfig,
} from '@/app/services/opencodeService.ts';

interface IStreamChatPayload {
  message?: unknown;
  sessionId?: unknown;
  directory?: unknown;
  systemPrompt?: unknown;
  model?: unknown;
}

const app = new Hono();

app.use('*', cors());

/**
 * SSE streaming endpoint for OpenCode chat.
 *
 * Flow:
 * 1. Create or reuse session
 * 2. Connect to OpenCode's /event SSE stream
 * 3. Send message via prompt_async
 * 4. Proxy relevant events back to client
 */
app.post('/', async (c) => {
  const configResult = getOpencodeConfig();
  if (!configResult.ok) {
    return c.json(
      { error: configResult.error },
      { status: configResult.status },
    );
  }

  let body: IStreamChatPayload;
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

  return streamSSE(c, async (stream) => {
    try {
      // Step 1: Create session if needed
      if (sessionId === undefined || sessionId === '') {
        const sessionBody: { title: string; model?: string } = {
          title: 'Scaffolder Chat',
        };
        if (model !== undefined && model !== '') {
          sessionBody.model = model;
        }
        const sessionResponse = await fetch(`${baseUrl}/session`, {
          method: 'POST',
          headers,
          body: JSON.stringify(sessionBody),
        });

        if (!sessionResponse.ok) {
          const text = await sessionResponse.text();
          await stream.writeSSE({
            event: 'error',
            data: JSON.stringify({
              error: `Failed to create session: ${String(sessionResponse.status)}`,
              details: text,
            }),
          });
          return;
        }

        const sessionData: unknown = await sessionResponse.json();
        if (
          typeof sessionData !== 'object' ||
          sessionData === null ||
          !('id' in sessionData) ||
          typeof sessionData.id !== 'string' ||
          sessionData.id === ''
        ) {
          await stream.writeSSE({
            event: 'error',
            data: JSON.stringify({ error: 'No session ID returned' }),
          });
          return;
        }

        sessionId = sessionData.id;
        await stream.writeSSE({
          event: 'session',
          data: JSON.stringify({ sessionId }),
        });
      }

      // Step 2: Connect to OpenCode's event stream
      const eventHeaders = new Headers(headers);
      eventHeaders.set('Accept', 'text/event-stream');

      const eventResponse = await fetch(`${baseUrl}/event`, {
        headers: eventHeaders,
      });

      if (!eventResponse.ok) {
        await stream.writeSSE({
          event: 'error',
          data: JSON.stringify({
            error: `Failed to connect to event stream: ${String(eventResponse.status)}`,
          }),
        });
        return;
      }

      const reader = eventResponse.body?.getReader();
      if (!reader) {
        await stream.writeSSE({
          event: 'error',
          data: JSON.stringify({ error: 'No event stream body' }),
        });
        return;
      }

      // Step 3: Send message asynchronously
      const promptBody: {
        parts: { type: string; text: string }[];
        system?: string;
        model?: { providerID: string; modelID: string };
      } = {
        parts: [{ type: 'text', text: String(body.message) }],
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
        `${baseUrl}/session/${sessionId}/prompt_async`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(promptBody),
        },
      );

      if (!promptResponse.ok) {
        const text = await promptResponse.text();
        await stream.writeSSE({
          event: 'error',
          data: JSON.stringify({
            error: `Failed to send message: ${String(promptResponse.status)}`,
            details: text,
          }),
        });
        void reader.cancel();
        return;
      }

      // Step 4: Process and proxy events
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantMessageStarted = false;
      let messageComplete = false;

      while (!messageComplete) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data:')) {
            const data = line.slice(5).trim();
            if (data === '' || data === '[DONE]') {
              continue;
            }

            try {
              interface IEventProps {
                sessionID?: string;
                messageID?: string;
                part?: { type: string; text?: string };
                info?: { id: string; role: string };
                error?: string;
              }
              interface IEvent {
                type: string;
                properties?: IEventProps;
              }
              const parsed: unknown = JSON.parse(data);
              if (
                typeof parsed !== 'object' ||
                parsed === null ||
                !('type' in parsed) ||
                typeof parsed.type !== 'string'
              ) {
                continue;
              }
              let eventProperties: IEventProps | undefined;
              if (
                'properties' in parsed &&
                typeof parsed.properties === 'object' &&
                parsed.properties !== null
              ) {
                eventProperties = parsed.properties as IEventProps;
              }
              const event: IEvent = {
                type: parsed.type,
                properties: eventProperties,
              };

              const props = event.properties;

              // Only process events for our session
              if (
                props?.sessionID !== undefined &&
                props.sessionID !== sessionId
              ) {
                continue;
              }

              switch (event.type) {
                case 'message.created':
                case 'message.updated':
                  // Check if this is an assistant message starting
                  if (
                    !assistantMessageStarted &&
                    props?.info?.role === 'assistant'
                  ) {
                    assistantMessageStarted = true;
                    await stream.writeSSE({
                      event: 'message_start',
                      data: JSON.stringify({
                        messageId: props.info.id,
                      }),
                    });
                  }
                  break;

                case 'part.updated':
                case 'message.part.updated':
                  if (
                    assistantMessageStarted &&
                    props?.part?.type === 'text' &&
                    props.part.text !== undefined &&
                    props.part.text !== ''
                  ) {
                    await stream.writeSSE({
                      event: 'text',
                      data: JSON.stringify({
                        text: props.part.text,
                      }),
                    });
                  }
                  break;

                case 'session.idle':
                case 'message.completed':
                  if (assistantMessageStarted) {
                    messageComplete = true;
                    await stream.writeSSE({
                      event: 'message_complete',
                      data: JSON.stringify({
                        messageId: props?.messageID,
                      }),
                    });
                  }
                  break;

                case 'session.error':
                case 'error':
                  await stream.writeSSE({
                    event: 'error',
                    data: JSON.stringify({
                      error: props?.error ?? 'Unknown error',
                    }),
                  });
                  messageComplete = true;
                  break;
              }
            } catch {
              // Not valid JSON, skip
            }
          }
        }
      }

      void reader.cancel();

      await stream.writeSSE({
        event: 'done',
        data: JSON.stringify({ sessionId }),
      });
    } catch (error) {
      await stream.writeSSE({
        event: 'error',
        data: JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      });
    }
  });
});

export default app;
