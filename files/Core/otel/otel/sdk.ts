import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

export interface IStartOpenTelemetryOptions {
  serviceName?: string;
}

function emptyToUndefined(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === '') {
    return undefined;
  }
  return value;
}

export function shouldStartOpenTelemetry(
  source: NodeJS.ProcessEnv = process.env,
): boolean {
  if (source.OTEL_SDK_DISABLED === 'true') {
    return false;
  }
  if (source.OTEL_ENABLED === 'true') {
    return true;
  }
  return emptyToUndefined(source.OTEL_EXPORTER_OTLP_ENDPOINT) !== undefined;
}

export function createNodeSdk(
  options: IStartOpenTelemetryOptions = {},
  source: NodeJS.ProcessEnv = process.env,
): NodeSDK {
  const serviceName =
    options.serviceName ?? emptyToUndefined(source.OTEL_SERVICE_NAME) ?? 'app';
  const autoInstrument = source.OTEL_AUTO_INSTRUMENT !== 'false';

  return new NodeSDK({
    serviceName,
    instrumentations: autoInstrument
      ? [
          getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-fs': { enabled: false },
          }),
        ]
      : [],
  });
}

export function startOpenTelemetry(
  options: IStartOpenTelemetryOptions = {},
  source: NodeJS.ProcessEnv = process.env,
): NodeSDK | undefined {
  if (!shouldStartOpenTelemetry(source)) {
    return undefined;
  }

  const sdk = createNodeSdk(options, source);
  sdk.start();

  const shutdown = (): void => {
    void sdk.shutdown();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);

  return sdk;
}
