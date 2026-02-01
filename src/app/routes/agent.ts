import { openai } from '@ai-sdk/openai';
import { convertToModelMessages, stepCountIs, streamText } from 'ai';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createRemoteAgentTools } from '@/app/services/remoteAgentTools.ts';
import type { ISSHConnection } from '@/app/services/sshService.ts';
import { connectToInstance, disconnect } from '@/app/services/sshService.ts';
import { REMOTE_AGENT_SYSTEM_PROMPT } from '@/prompts/index.ts';
import { verifyAuth0TokenFromAuthHeader } from '@/utils/verifyAuth0Token.ts';

interface IAgentChatPayload {
  messages?: unknown;
  infraCredentials?: {
    sshPrivateKey?: unknown;
    host?: unknown;
  };
}

const app = new Hono();

app.use('*', cors());

app.post('/chat', async (c) => {
  const authResult = await verifyAuth0TokenFromAuthHeader(
    c.req.header('authorization'),
  );

  if (!authResult.ok) {
    return c.json(authResult.body, authResult.status);
  }

  let body: IAgentChatPayload;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  if (!Array.isArray(body.messages)) {
    return c.json({ error: 'Invalid messages format' }, 400);
  }

  const credentials = body.infraCredentials;
  if (
    !credentials ||
    typeof credentials.sshPrivateKey !== 'string' ||
    credentials.sshPrivateKey.trim() === '' ||
    typeof credentials.host !== 'string' ||
    credentials.host.trim() === ''
  ) {
    return c.json(
      {
        error: 'Missing credentials',
        message: 'SSH private key and host are required',
      },
      400,
    );
  }

  // Type narrowing already guaranteed above
  const sshPrivateKey = credentials.sshPrivateKey;
  const host = credentials.host;

  let client: ISSHConnection;
  try {
    client = await connectToInstance({
      host,
      privateKey: sshPrivateKey,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to connect via SSH';
    return c.json({ error: 'SSH connection failed', message }, 502);
  }

  try {
    console.error('[Agent] Converting messages...');
    // body.messages is validated as Array above (Array.isArray check)
    // The AI SDK's convertToModelMessages handles the conversion
    const messagesArray: unknown[] = body.messages;
    type ModelMessagesInput = Parameters<typeof convertToModelMessages>[0];
    const messagesInput = messagesArray as ModelMessagesInput;
    const convertedMessages = await convertToModelMessages(messagesInput);
    console.error(
      '[Agent] Messages converted:',
      String(convertedMessages.length),
    );

    console.error('[Agent] Creating remote agent tools...');
    const tools = createRemoteAgentTools(client);
    console.error('[Agent] Tools created');

    console.error('[Agent] Starting streamText...');
    const result = streamText({
      model: openai('gpt-5-nano'),
      system: REMOTE_AGENT_SYSTEM_PROMPT,
      messages: convertedMessages,
      tools,
      stopWhen: stepCountIs(20),
      onFinish: () => {
        console.error('[Agent] Stream finished, disconnecting...');
        void disconnect(client);
      },
    });

    console.error('[Agent] Returning stream response...');
    return result.toUIMessageStreamResponse();
  } catch (err: unknown) {
    await disconnect(client);
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;
    console.error('[Agent] Error:', errorMessage);
    console.error('[Agent] Stack:', errorStack);
    return c.json(
      { error: 'Internal server error', details: errorMessage },
      500,
    );
  }
});

export default app;
