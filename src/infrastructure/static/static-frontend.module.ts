import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const clientDist = join(process.cwd(), 'client', 'dist');

@Module({
  imports: existsSync(join(clientDist, 'index.html'))
    ? [
        ServeStaticModule.forRoot({
          rootPath: clientDist,
          exclude: ['/api*'],
          serveRoot: '/',
        }),
      ]
    : [],
})
export class StaticFrontendModule {}
