import './tracing.js';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { json } from 'express';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { isTrustProxyEnabled, parseEnv } from './config/env.schema.js';
import { MetricsService } from './infrastructure/observability/metrics.service.js';
import {
  getRequestHeapDeltaMb,
  getRequestQueryCount,
  isBenchInstrumentEnabled,
  runWithRequestQueryContext,
} from './infrastructure/database/request-query-context.js';
import { buildOpenApiDocument } from './openapi/build-openapi-document.js';

async function bootstrap(): Promise<void> {
  const env = parseEnv();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });
  app.useLogger(app.get(Logger));

  if (isTrustProxyEnabled(env)) {
    app.set('trust proxy', 1);
  }

  const metrics = app.get(MetricsService);

  if (isBenchInstrumentEnabled()) {
    app.use(
      (
        _req: unknown,
        res: {
          setHeader: (name: string, value: string) => void;
          json: (body: unknown) => unknown;
          send: (body: unknown) => unknown;
        },
        next: () => void,
      ) => {
        runWithRequestQueryContext(() => {
          const attach = (): void => {
            res.setHeader('X-Db-Queries', String(getRequestQueryCount()));
            res.setHeader('X-Heap-Delta-Mb', String(getRequestHeapDeltaMb()));
          };
          const originalJson = res.json.bind(res);
          const originalSend = res.send.bind(res);
          res.json = (body: unknown) => {
            attach();
            return originalJson(body);
          };
          res.send = (body: unknown) => {
            attach();
            return originalSend(body);
          };
          next();
        });
      },
    );
  }

  app.use(helmet());
  app.use(json({ limit: env.BODY_LIMIT }));
  app.use(
    rateLimit({
      windowMs: env.THROTTLE_TTL_MS,
      max: env.THROTTLE_LIMIT,
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        const path = req.path ?? '';
        return path.includes('/health');
      },
      handler: (_req, res, _next, options) => {
        metrics.recordRateLimitRejected();
        res.status(options.statusCode).json({
          statusCode: options.statusCode,
          error: 'Too Many Requests',
          message: options.message,
          code: 'RATE_LIMIT_EXCEEDED',
        });
      },
    }),
  );

  if (env.NODE_ENV === 'production') {
    const origins = env.CORS_ORIGINS.split(',')
      .map((o) => o.trim())
      .filter((o) => o.length > 0);
    if (origins.length > 0) {
      app.enableCors({ origin: origins, credentials: false });
    }
  } else {
    app.enableCors({ origin: true });
  }

  app.setGlobalPrefix('api/v1');

  if (env.NODE_ENV !== 'production') {
    const document = buildOpenApiDocument(app);
    SwaggerModule.setup('api/docs', app, document);
  }

  const clientIndex = join(process.cwd(), 'client', 'dist', 'index.html');
  if (existsSync(clientIndex)) {
    const http = app.getHttpAdapter().getInstance() as {
      get: (
        path: RegExp,
        handler: (
          req: { path?: string },
          res: { sendFile: (file: string) => void },
          next: () => void,
        ) => void,
      ) => void;
    };
    http.get(/^(?!\/api).*/, (req, res, next) => {
      const path = req.path ?? '';
      if (path.includes('.')) {
        next();
        return;
      }
      res.sendFile(clientIndex);
    });
  }

  await app.listen(env.PORT);
}

await bootstrap();
