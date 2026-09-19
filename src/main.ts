import './tracing.js';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { parseEnv } from './config/env.schema.js';

async function bootstrap(): Promise<void> {
  const env = parseEnv();

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
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

  await app.listen(env.PORT);
}

await bootstrap();
