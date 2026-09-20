/**
 * Headers sensíveis não entram em span attributes (headersToSpanAttributes vazio).
 */
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim();

if (!process.env.OTEL_SERVICE_NAME?.trim()) {
  process.env.OTEL_SERVICE_NAME = 'brain-ag-api';
}

try {
  const sdk = new NodeSDK({
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-http': {
          headersToSpanAttributes: {
            client: { requestHeaders: [], responseHeaders: [] },
            server: { requestHeaders: [], responseHeaders: [] },
          },
        },
      }),
    ],
    ...(otlpEndpoint
      ? {
          traceExporter: new OTLPTraceExporter({
            url: otlpEndpoint.includes('/v1/traces')
              ? otlpEndpoint
              : `${otlpEndpoint.replace(/\/$/, '')}/v1/traces`,
          }),
        }
      : {}),
  });

  sdk.start();

  process.on('SIGTERM', () => {
    void sdk.shutdown();
  });
} catch (error) {
  console.warn(
    'OpenTelemetry failed to start:',
    error instanceof Error ? error.message : error,
  );
}
