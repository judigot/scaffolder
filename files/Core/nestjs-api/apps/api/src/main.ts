import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { resolveAllowedOrigins } from './cors-origins';
import { parsePort } from './env';
import { NotFoundFilter } from './not-found.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new NotFoundFilter());
  app.enableCors({
    origin: resolveAllowedOrigins(),
    credentials: true,
  });

  const port = parsePort();
  await app.listen(port);
  console.error(`API listening on http://localhost:${String(port)}`);
}

void bootstrap();
