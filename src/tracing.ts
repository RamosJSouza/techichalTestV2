/**
 * OpenTelemetry bootstrap — importado antes do Nest em main.ts.
 * Em ambientes sem collector, as instrumentações operam em no-op.
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

try {
  const sdk = new NodeSDK({
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
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
