import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ExampleProcessor } from './example.processor';
import { DEFAULT_QUEUE } from './queue.constants';
import { QueueController } from './queue.controller';
import { parseRedisConnection } from './redis.connection';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: parseRedisConnection(),
      }),
    }),
    BullModule.registerQueue({ name: DEFAULT_QUEUE }),
  ],
  controllers: [QueueController],
  providers: [ExampleProcessor],
  exports: [BullModule],
})
export class QueueModule {}
