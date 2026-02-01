import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { convertToModelMessages, stepCountIs, streamText } from 'ai';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
  getGitHubAppConfig,
  getGitHubAppOctokit,
} from '@/app/services/githubAppService.ts';
import { createRepoAgentTools } from '@/app/services/repoAgentTools.ts';
import { buildRepoAgentPrompt } from '@/prompts/index.ts';
import { verifyAuth0TokenFromAuthHeader } from '@/utils/verifyAuth0Token.ts';

/**
 * Type guard to validate tool call structure from AI SDK
 */
function isToolCall(obj: unknown): obj is { toolName: string } {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  return 'toolName' in obj && typeof obj.toolName === 'string';
}

// Model configurations
const MODEL_CONFIGS = {
  'gpt-5-nano': { provider: 'openai', modelId: 'gpt-4.1-nano' },
  'gpt-5-mini': { provider: 'openai', modelId: 'gpt-4.1-mini' },
  'gpt-5.2-codex': { provider: 'openai', modelId: 'o3' },
  'claude-sonnet-4.5': {
    provider: 'anthropic',
    modelId: 'claude-sonnet-4-20250514',
  },
  'claude-opus-4.5': {
    provider: 'anthropic',
    modelId: 'claude-opus-4-20250514',
  },
} as const;

type ModelId = keyof typeof MODEL_CONFIGS;

function isValidModelId(id: unknown): id is ModelId {
  return typeof id === 'string' && id in MODEL_CONFIGS;
}

interface IRepoAgentPayload {
  messages?: unknown;
  repoUrl?: string;
  model?: string;
}

interface ISimpleMessage {
  role: string;
  content?: string;
}

interface IUIMessage {
  id?: string;
  role: 'system' | 'user' | 'assistant';
  parts: { type: 'text'; text: string }[];
}

/**
 * Convert simple { role, content } messages to UIMessage format with parts
 */
function isUIMessage(msg: unknown): msg is IUIMessage {
  if (typeof msg !== 'object' || msg === null || !('parts' in msg)) {
    return false;
  }
  const msgRecord = msg;
  return Array.isArray(msgRecord.parts);
}

function isSimpleMessage(msg: unknown): msg is ISimpleMessage {
  if (typeof msg !== 'object' || msg === null || !('role' in msg)) {
    return false;
  }
  const msgRecord = msg;
  return typeof msgRecord.role === 'string';
}

function convertToUIMessages(messages: unknown[]): IUIMessage[] {
  return messages.map((msg, index) => {
    // Check if it's already in UIMessage format (has parts)
    if (isUIMessage(msg)) {
      return msg;
    }

    // Convert simple { role, content } format
    if (!isSimpleMessage(msg)) {
      return {
        id: `msg-${String(index)}`,
        role: 'user' as const,
        parts: [{ type: 'text' as const, text: '' }],
      };
    }

    let role: 'user' | 'system' | 'assistant';
    if (msg.role === 'user') {
      role = 'user';
    } else if (msg.role === 'system') {
      role = 'system';
    } else {
      role = 'assistant';
    }

    const textContent = msg.content ?? '';
    return {
      id: `msg-${String(index)}`,
      role,
      parts: [{ type: 'text' as const, text: textContent }],
    };
  });
}

function parseGitHubURL(url: string): { owner: string; repo: string } | null {
  try {
    const githubRegex = /github\.com\/([^/]+)\/([^/]+)/;
    const match = githubRegex.exec(url);
    const owner = match?.[1];
    const repo = match?.[2];

    if (owner !== undefined && repo !== undefined) {
      return {
        owner,
        repo: repo.replace(/\.git$/, ''),
      };
    }
    return null;
  } catch {
    return null;
  }
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

  let body: IRepoAgentPayload;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  if (!Array.isArray(body.messages)) {
    return c.json({ error: 'Invalid messages format' }, 400);
  }

  if (typeof body.repoUrl !== 'string' || body.repoUrl.trim() === '') {
    return c.json({ error: 'Repository URL is required' }, 400);
  }

  const repoInfo = parseGitHubURL(body.repoUrl);
  if (repoInfo === null) {
    return c.json({ error: 'Invalid GitHub repository URL' }, 400);
  }

  // Get GitHub App configuration
  const appConfig = getGitHubAppConfig();
  if (appConfig === null) {
    return c.json(
      {
        error: 'GitHub App not configured',
        message:
          'Set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY environment variables',
      },
      500,
    );
  }

  // Get authenticated Octokit instance
  let octokit: Awaited<ReturnType<typeof getGitHubAppOctokit>>;
  try {
    octokit = await getGitHubAppOctokit(appConfig, {
      owner: repoInfo.owner,
      repo: repoInfo.repo,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to authenticate with GitHub';
    return c.json({ error: 'GitHub authentication failed', message }, 502);
  }

  // Get the default branch
  let baseBranch = 'main';
  try {
    const repoData = await octokit.repos.get({
      owner: repoInfo.owner,
      repo: repoInfo.repo,
    });
    baseBranch = repoData.data.default_branch;
  } catch (err: unknown) {
    console.warn(
      "[RepoAgent] Could not fetch default branch, using 'main':",
      err,
    );
  }

  // Determine which model to use
  const modelId = isValidModelId(body.model) ? body.model : 'gpt-5-nano';
  const modelConfig = MODEL_CONFIGS[modelId];

  const model =
    modelConfig.provider === 'openai'
      ? openai(modelConfig.modelId)
      : anthropic(modelConfig.modelId);

  try {
    console.error('[RepoAgent] Converting messages...');
    // First convert simple messages to UIMessage format, then to ModelMessages
    // body.messages is validated as Array above (Array.isArray check)
    const messagesArray: unknown[] = body.messages;
    const uiMessages = convertToUIMessages(messagesArray);
    const convertedMessages = await convertToModelMessages(uiMessages);
    console.error(
      '[RepoAgent] Messages converted:',
      String(convertedMessages.length),
    );

    console.error('[RepoAgent] Creating repo agent tools...');
    const tools = createRepoAgentTools(octokit, {
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      baseBranch,
    });
    console.error('[RepoAgent] Tools created');

    // Add repository context to system prompt
    const contextualPrompt = buildRepoAgentPrompt(
      repoInfo.owner,
      repoInfo.repo,
      baseBranch,
    );

    console.error('[RepoAgent] Starting streamText with model:', modelId);

    // Build streamText options - reasoning models like o3 don't support temperature
    const baseOptions = {
      model,
      system: contextualPrompt,
      messages: convertedMessages,
      tools,
      stopWhen: stepCountIs(10), // CRITICAL: Enable multi-step tool execution (up to 10 steps)
      onStepFinish: (data: unknown) => {
        // Type guard to validate structure
        if (
          typeof data !== 'object' ||
          data === null ||
          !('text' in data) ||
          !('toolCalls' in data) ||
          !('toolResults' in data) ||
          !('finishReason' in data)
        ) {
          console.error('[RepoAgent] Invalid StepFinish data structure');
          return;
        }

        // Use proper type narrowing without assertions
        const dataObj = data;
        const text =
          'text' in dataObj && typeof dataObj.text === 'string'
            ? dataObj.text
            : '';
        const toolCalls =
          'toolCalls' in dataObj && Array.isArray(dataObj.toolCalls)
            ? dataObj.toolCalls
            : [];
        const toolResults =
          'toolResults' in dataObj && Array.isArray(dataObj.toolResults)
            ? dataObj.toolResults
            : [];
        const finishReason =
          'finishReason' in dataObj ? dataObj.finishReason : null;

        console.error('[RepoAgent] Step finished. Reason:', finishReason);

        if (text !== '') {
          console.error('[RepoAgent] Text:', text.slice(0, 100));
        }

        if (toolCalls.length > 0) {
          const validToolCalls = toolCalls.filter(isToolCall);
          console.error(
            '[RepoAgent] Tool calls:',
            validToolCalls.map((tc) => tc.toolName),
          );
        }

        if (toolResults.length > 0) {
          console.error(
            '[RepoAgent] Tool results:',
            String(toolResults.length),
          );
        }
      },
      onFinish: (data: unknown) => {
        // Type guard to validate structure
        if (
          typeof data !== 'object' ||
          data === null ||
          !('finishReason' in data) ||
          !('usage' in data)
        ) {
          console.error('[RepoAgent] Invalid Finish data structure');
          return;
        }

        // Use proper type narrowing without assertions
        const dataObj = data;
        const finishReason =
          'finishReason' in dataObj ? dataObj.finishReason : null;
        const usage = 'usage' in dataObj ? dataObj.usage : null;

        console.error('[RepoAgent] Finished. Reason:', finishReason);
        console.error('[RepoAgent] Usage:', usage);
      },
    };

    // Create options with conditional temperature - reasoning models don't support it
    if (modelId !== 'gpt-5.2-codex') {
      const optionsWithTemp = {
        ...baseOptions,
        temperature: 0.7,
      };
      const result = streamText(optionsWithTemp);
      return result.toUIMessageStreamResponse();
    }

    const result = streamText(baseOptions);

    console.error('[RepoAgent] Returning stream response...');
    return result.toUIMessageStreamResponse();
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;
    console.error('[RepoAgent] Error:', errorMessage);
    console.error('[RepoAgent] Stack:', errorStack);
    return c.json(
      { error: 'Internal server error', details: errorMessage },
      500,
    );
  }
});

export default app;
