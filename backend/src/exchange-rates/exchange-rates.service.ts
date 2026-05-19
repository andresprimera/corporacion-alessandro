import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { type CreateExchangeRateInput } from '@base-dashboard/shared';
import {
  ExchangeRate,
  ExchangeRateDocument,
} from './schemas/exchange-rate.schema';
import { isDuplicateKeyError } from '../common/utils/mongo-errors';

@Injectable()
export class ExchangeRatesService {
  private readonly logger = new Logger(ExchangeRatesService.name);

  constructor(
    @InjectModel(ExchangeRate.name)
    private exchangeRateModel: Model<ExchangeRate>,
  ) {}

  async create(data: CreateExchangeRateInput): Promise<ExchangeRateDocument> {
    const rateDate = new Date(`${data.rateDate}T00:00:00.000Z`);
    const now = new Date();
    const todayUtc = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    if (rateDate.getTime() < todayUtc.getTime()) {
      throw new BadRequestException('rateDate cannot be in the past');
    }

    try {
      const doc = await this.exchangeRateModel.create({
        rateDate,
        value: data.value,
      });
      this.logger.log(
        `Exchange rate created for ${data.rateDate}: ${data.value}`,
      );
      return doc;
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw new ConflictException('Rate for this date already exists');
      }
      throw err;
    }
  }

  async findAllPaginated(
    page: number,
    limit: number,
  ): Promise<{ data: ExchangeRateDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.exchangeRateModel
        .find()
        .sort({ rateDate: -1 })
        .skip(skip)
        .limit(limit),
      this.exchangeRateModel.countDocuments(),
    ]);
    return { data, total };
  }
}
