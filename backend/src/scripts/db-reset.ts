import 'reflect-metadata';
import { createConnection } from 'mongoose';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';

async function dbReset(): Promise<void> {
  const logger = new Logger('DbReset');
  const uri = process.env.MONGO_URI;

  if (!uri) {
    logger.error(
      'MONGO_URI is not set. Run via `pnpm db:reset` so backend/.env is loaded.',
    );
    process.exit(1);
  }

  const conn = await createConnection(uri).asPromise();
  logger.log(`Dropping database "${conn.name}"...`);
  await conn.dropDatabase();
  await conn.close();
  logger.log('Database dropped.');

  logger.log('Bootstrapping app to reseed...');
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error'],
  });
  await app.init();
  await app.close();
  logger.log('Reseed complete.');
}

dbReset().catch((err: unknown) => {
  const logger = new Logger('DbReset');
  logger.error(err instanceof Error ? (err.stack ?? err.message) : String(err));
  process.exit(1);
});
