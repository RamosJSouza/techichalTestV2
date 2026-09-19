import './tracing.js';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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

  if (env.NODE_ENV !== 'production') {
    app.enableCors({ origin: true });
  }

  app.setGlobalPrefix('api/v1');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Brain Agriculture API')
    .setDescription(
      'API de gestão de produtores rurais, fazendas, safras e dashboard analítico.',
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
