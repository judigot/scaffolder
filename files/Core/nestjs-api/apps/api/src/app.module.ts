import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HelloController } from './hello.controller';

@Module({
  controllers: [HealthController, HelloController],
})
export class AppModule {}
