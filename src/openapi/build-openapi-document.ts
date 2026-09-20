import type { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';

export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Brain Agriculture API')
    .setDescription(
      'API de gestão de produtores rurais, fazendas, safras e dashboard analítico. Sem autenticação no escopo atual — proteja a rede e use rate limit/CORS em produção.',
    )
    .setVersion('1.0.0')
    .build();

  return cleanupOpenApiDoc(
    SwaggerModule.createDocument(app, swaggerConfig),
  );
}
