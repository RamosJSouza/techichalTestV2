import './tracing.js';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { parseEnv } from './config/env.schema.js';

async function bootstrap(): Promise<void> {
  const env = parseEnv();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.use(
    rateLimit({
      windowMs: env.THROTTLE_TTL_MS,
      max: env.THROTTLE_LIMIT,
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        const path = req.path ?? '';
        return (
          path.includes('/health') ||
          path.includes('/metrics') ||
          path.includes('/api/docs')
        );
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

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Brain Agriculture API')
    .setDescription(
      'API de gestão de produtores rurais, fazendas, safras e dashboard analítico. Sem autenticação no escopo atual — proteja a rede e use rate limit/CORS em produção.',
    )
    .setVersion('1.0.0')
    .build();

  const document = cleanupOpenApiDoc(
    SwaggerModule.createDocument(app, swaggerConfig),
  );
  SwaggerModule.setup('api/docs', app, document);

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
