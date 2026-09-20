/**
 * OpenTelemetry bootstrap — importado antes do Nest em main.ts.
 * Com OTEL_EXPORTER_OTLP_ENDPOINT: exporta traces via OTLP/HTTP.
 * Sem endpoint: SDK sobe sem exporter (no-op de export).
 * OTEL_SERVICE_NAME (opcional) é lido pelo SDK via Resource detectors / env.
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
