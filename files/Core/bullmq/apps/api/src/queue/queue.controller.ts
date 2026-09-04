import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { DEFAULT_QUEUE } from './queue.constants';
import type { IExampleJob } from './example.processor';

function isExampleJob(value: unknown): value is IExampleJob {
  if (value === undefined || value === null) {
    return true;
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  if (!('message' in value)) {
    return true;
  }
  return typeof value.message === 'string';
}

@Controller('queue')
export class QueueController {
  constructor(
    @InjectQueue(DEFAULT_QUEUE) private readonly queue: Queue<IExampleJob>,
  ) {}

  @Get('health')
  async health(): Promise<{
    status: 'healthy';
    queue: string;
    counts: Record<string, number>;
  }> {
    const counts = await this.queue.getJobCounts();
    return { status: 'healthy', queue: DEFAULT_QUEUE, counts };
  }

  @Post('jobs')
  async enqueue(@Body() body: unknown): Promise<{ id: string | undefined }> {
    if (!isExampleJob(body)) {
      throw new BadRequestException('Invalid job payload');
    }
    const job = await this.queue.add('example', body ?? {});
    return { id: job.id };
  }
}
