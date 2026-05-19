import { type ExchangeRate } from '@base-dashboard/shared';
import { ExchangeRateDocument } from '../schemas/exchange-rate.schema';

function toIsoDate(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function toExchangeRate(doc: ExchangeRateDocument): ExchangeRate {
  return {
    id: doc.id,
    rateDate: toIsoDate(doc.rateDate),
    value: doc.value,
    createdAt: doc.get('createdAt').toISOString(),
    updatedAt: doc.get('updatedAt').toISOString(),
  };
}
