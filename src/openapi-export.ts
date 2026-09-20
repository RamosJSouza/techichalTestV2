import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { buildOpenApiDocument } from './openapi/build-openapi-document.js';

async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: false,
    bufferLogs: true,
  });
  app.setGlobalPrefix('api/v1');
  const document = buildOpenApiDocument(app);
  const outPath = join(process.cwd(), 'docs', 'openapi.json');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
  console.log(`OpenAPI written: ${outPath}`);
  await app.close();
}

await main();
