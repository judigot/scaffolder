# BullMQ core (Nest-first)

Compose-ready Redis/BullMQ overlay for `/Core/nestjs-api`. This is **not** a
jobs-only golden. Import `QueueModule` into `AppModule` after both cores merge.

## Layout

```text
apps/api/src/queue/   QueueModule, processor, HTTP enqueue/health
compose.redis.yml     Redis service for docker compose
```

## Composition

```yaml
$USE_CORE:
  - /Core/template-monorepo
  - /Core/nestjs-api
  - /Core/bullmq
```

```ts
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [QueueModule],
  controllers: [HealthController, HelloController],
})
export class AppModule {}
```

Include `compose.redis.yml` next to the app compose file:

```sh
docker compose -f compose.yml -f compose.redis.yml up -d redis
```

## Environment

- `REDIS_HOST` (default `127.0.0.1`)
- `REDIS_PORT` (default `6379`)

## HTTP (after QueueModule is imported)

- `GET /api/queue/health`
- `POST /api/queue/jobs` `{ "message": "..." }`
