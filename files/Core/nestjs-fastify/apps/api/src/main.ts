import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { resolveAllowedOrigins } from './cors-origins';
import { parsePort } from './env';
import { NotFoundFilter } from './not-found.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
    { logger: ['error', 'warn'] },
  );
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new NotFoundFilter());
  app.enableCors({
    origin: resolveAllowedOrigins(),
    credentials: true,
  });

  const port = parsePort();
  await app.listen(port, '0.0.0.0');
  console.error(`API listening on http://localhost:${String(port)}`);
}

void bootstrap();
