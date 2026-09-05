import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { DEFAULT_QUEUE } from './queue.constants';

export interface IExampleJob {
  message?: string;
}

@Processor(DEFAULT_QUEUE)
export class ExampleProcessor extends WorkerHost {
  async process(job: Job<IExampleJob>): Promise<{ ok: true; id: string }> {
    const id = job.id ?? 'unknown';
    return { ok: true, id };
  }
}
