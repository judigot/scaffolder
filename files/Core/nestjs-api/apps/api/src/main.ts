import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { resolveAllowedOrigins } from './cors-origins';
import { parsePort } from './env';
import { NotFoundFilter } from './not-found.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
  });
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new NotFoundFilter());
  app.enableCors({
    origin: resolveAllowedOrigins(),
    credentials: true,
  });

  const port = parsePort();
  // Bind IPv4 explicitly so GitHub Actions `127.0.0.1` / `localhost` health
  // checks reach the server. A host-less listen() can end up on `::` only.
  await app.listen(port, '0.0.0.0');
  console.error(`API listening on http://127.0.0.1:${String(port)}`);
}

void bootstrap();
