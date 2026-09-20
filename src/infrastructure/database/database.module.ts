import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { Env } from '../../config/env.schema.js';
import { CryptoService } from '../crypto/crypto.service.js';
import * as schema from './schema/index.js';
import { CRYPTO_SERVICE, DRIZZLE } from './database.tokens.js';

export type DrizzleDb = PostgresJsDatabase<typeof schema>;

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): DrizzleDb => {
        const client = postgres(config.get('DATABASE_URL', { infer: true }));
        return drizzle(client, { schema });
      },
    },
    {
      provide: CRYPTO_SERVICE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): CryptoService => {
        return new CryptoService(config.get('PEPPER_SECRET', { infer: true }), {
          keyId: config.get('ENCRYPTION_KEY_ID', { infer: true }),
          keyHex: config.get('ENCRYPTION_KEY', { infer: true }),
          previousKeyId: config.get('ENCRYPTION_KEY_PREVIOUS_ID', {
            infer: true,
          }),
          previousKeyHex: config.get('ENCRYPTION_KEY_PREVIOUS', {
            infer: true,
          }),
        });
      },
    },
  ],
  exports: [DRIZZLE, CRYPTO_SERVICE],
})
export class DatabaseModule {}
