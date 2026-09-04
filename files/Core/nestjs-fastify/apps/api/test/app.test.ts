import 'reflect-metadata';
import { afterAll, beforeAll, expect, test } from 'bun:test';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';
import { NotFoundFilter } from '../src/not-found.filter';

interface IHealthBody {
  status: string;
  timestamp: string;
}

function isHealthBody(value: unknown): value is IHealthBody {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  if (!('status' in value) || !('timestamp' in value)) {
    return false;
  }
  return (
    typeof value.status === 'string' && typeof value.timestamp === 'string'
  );
}

function readPort(address: unknown): number {
  if (typeof address !== 'object' || address === null) {
    throw new Error('Expected TCP listen address');
  }
  if (!('port' in address) || typeof address.port !== 'number') {
    throw new Error('Expected TCP listen address');
  }
  return address.port;
}

let app: INestApplication | undefined;
let baseUrl = '';

beforeAll(async () => {
  app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
    { logger: false },
  );
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new NotFoundFilter());
  await app.listen(0, '127.0.0.1');
  const port = readPort(app.getHttpServer().address());
  baseUrl = `http://127.0.0.1:${String(port)}`;
});

afterAll(async () => {
  if (app !== undefined) {
    await app.close();
  }
});

test('GET /api/health returns healthy', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  expect(response.status).toBe(200);
  const body: unknown = await response.json();
  expect(isHealthBody(body)).toBe(true);
  if (!isHealthBody(body)) {
    throw new Error('Expected health payload');
  }
  expect(body.status).toBe('healthy');
});

test('GET /api/hello returns greeting', async () => {
  const response = await fetch(`${baseUrl}/api/hello`);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ message: 'Hello, world!' });
});

test('unknown route returns JSON 404', async () => {
  const response = await fetch(`${baseUrl}/api/nope`);
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ error: 'Not Found' });
});
