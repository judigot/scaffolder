import {
  BadRequestException,
  type ArgumentMetadata,
  type PipeTransform,
} from '@nestjs/common';
import type { ZodType } from 'zod';

export class ZodValidationPipe implements PipeTransform<unknown, unknown> {
  public constructor(private readonly schema: ZodType) {}

  public transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        error: 'Validation failed',
        issues: result.error.issues,
      });
    }
    return result.data;
  }
}
