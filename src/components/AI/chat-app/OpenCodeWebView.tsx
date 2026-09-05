import { useQuery } from '@tanstack/react-query';
import { getApiUrl } from '@/utils/getApiUrl.ts';
import { isRecord } from '@/utils/typeGuards.ts';

interface IOpenCodeHealthResponse {
  connected: boolean;
  url?: string;
  version?: string;
  directory?: string;
  error?: string;
}

const parseHealthResponse = (payload: unknown): IOpenCodeHealthResponse => {
  if (!isRecord(payload)) {
    throw new Error('Invalid OpenCode health response');
  }

  const connectedValue = payload.connected;
  if (typeof connectedValue !== 'boolean') {
    throw new Error('OpenCode health response missing connection flag');
  }

  const errorMessage =
    typeof payload.error === 'string' ? payload.error : undefined;
  if (!connectedValue && errorMessage === undefined) {
    throw new Error('OpenCode web server did not return a connection status');
  }

  return {
    connected: connectedValue,
    url: typeof payload.url === 'string' ? payload.url : undefined,
    version: typeof payload.version === 'string' ? payload.version : undefined,
    directory:
      typeof payload.directory === 'string' ? payload.directory : undefined,
    error: errorMessage,
  };
};

const fetchHealth = async (): Promise<IOpenCodeHealthResponse> => {
  const response = await fetch(`${getApiUrl()}/opencode/health`);
  if (!response.ok) {
    const details = await response.text();
    const statusMessage = `${response.status.toString()} ${response.statusText}`;
    const message = details.trim() || statusMessage;
    throw new Error(`OpenCode health check failed: ${message}`);
  }

  const payload: unknown = await response.json();
  return parseHealthResponse(payload);
};

export default function OpenCodeWebView() {
  const { data, error, status } = useQuery<IOpenCodeHealthResponse>({
    queryKey: ['opencode', 'health'],
    queryFn: fetchHealth,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });

  if (status === 'pending') {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-fg-muted">
        Loading OpenCode Web...
      </div>
    );
  }

  if (status === 'error') {
    const healthErrorMessage = error.message;
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-sm text-fg-muted space-y-2">
        <p>Unable to reach the OpenCode Web server.</p>
        <p className="text-xs text-fg-subtle">{healthErrorMessage}</p>
        <p className="text-xs text-fg-subtle">
          Run{' '}
          <code className="bg-bg-base px-1 rounded">
            opencode web --port 4096
          </code>{' '}
          and set <code className="bg-bg-base px-1 rounded">OPENCODE_URL</code>{' '}
          if you changed the port.
        </p>
      </div>
    );
  }

  const health = data;
  if (!health.connected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-sm text-fg-muted space-y-2">
        <p>OpenCode Web is not connected.</p>
        {typeof health.error === 'string' && (
          <p className="text-xs text-fg-subtle">{health.error}</p>
        )}
        <p className="text-xs text-fg-subtle">
          Ensure the OpenCode web server is running and accessible at the
          configured URL.
        </p>
      </div>
    );
  }

  if (health.url === undefined) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-sm text-fg-muted space-y-2">
        <p>OpenCode Web is not connected.</p>
        <p className="text-xs text-fg-subtle">
          Ensure the OpenCode web server is running and accessible at the
          configured URL.
        </p>
      </div>
    );
  }

  const url = health.url;

  return (
    <iframe
      src={url}
      title="OpenCode Web"
      className="w-full h-full border-0"
      allow="clipboard-read clipboard-write"
      sandbox="allow-scripts allow-same-origin allow-forms"
    />
  );
}
