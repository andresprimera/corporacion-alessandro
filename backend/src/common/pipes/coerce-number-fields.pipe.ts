import { PipeTransform, ArgumentMetadata } from '@nestjs/common';

export class CoerceNumberFieldsPipe implements PipeTransform {
  constructor(private fields: string[]) {}

  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (metadata.type !== 'body') {
      return value;
    }
    if (typeof value !== 'object' || value === null) {
      return value;
    }
    const obj = value as Record<string, unknown>;
    for (const field of this.fields) {
      const raw = obj[field];
      if (typeof raw === 'string' && raw.trim().length > 0) {
        const n = Number(raw);
        if (!Number.isNaN(n)) {
          obj[field] = n;
        }
      }
    }
    return obj;
  }
}
