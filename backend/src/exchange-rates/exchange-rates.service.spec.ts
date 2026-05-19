import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { ExchangeRatesService } from './exchange-rates.service';
import { ExchangeRate } from './schemas/exchange-rate.schema';

describe('ExchangeRatesService', () => {
  let service: ExchangeRatesService;
  let model: Record<string, jest.Mock>;

  function ymdUtc(date: Date): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }

  beforeEach(async () => {
    model = {
      create: jest.fn(),
      countDocuments: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExchangeRatesService,
        { provide: getModelToken(ExchangeRate.name), useValue: model },
      ],
    }).compile();

    service = module.get<ExchangeRatesService>(ExchangeRatesService);
  });

  describe('create', () => {
    it('creates an exchange rate for today at UTC midnight', async () => {
      const today = ymdUtc(new Date());
      const created = { id: 'rate-1', rateDate: new Date(), value: 36.5 };
      model.create.mockResolvedValue(created);

      const result = await service.create({ rateDate: today, value: 36.5 });

      const callArg = model.create.mock.calls[0][0];
      expect(callArg.value).toBe(36.5);
      expect(callArg.rateDate).toBeInstanceOf(Date);
      expect(callArg.rateDate.toISOString()).toBe(`${today}T00:00:00.000Z`);
      expect(result).toBe(created);
    });

    it('creates an exchange rate for a future date', async () => {
      const future = new Date();
      future.setUTCDate(future.getUTCDate() + 7);
      const futureYmd = ymdUtc(future);
      model.create.mockResolvedValue({});

      await service.create({ rateDate: futureYmd, value: 40 });

      expect(model.create).toHaveBeenCalled();
    });

    it('rejects past dates with BadRequestException', async () => {
      const past = new Date();
      past.setUTCDate(past.getUTCDate() - 1);
      const pastYmd = ymdUtc(past);

      await expect(
        service.create({ rateDate: pastYmd, value: 36.5 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(model.create).not.toHaveBeenCalled();
    });

    it('translates Mongo duplicate-key error to ConflictException', async () => {
      const today = ymdUtc(new Date());
      const dupErr = Object.assign(new Error('dup'), { code: 11000 });
      model.create.mockRejectedValue(dupErr);

      await expect(
        service.create({ rateDate: today, value: 36.5 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rethrows non-duplicate errors unchanged', async () => {
      const today = ymdUtc(new Date());
      const otherErr = new Error('boom');
      model.create.mockRejectedValue(otherErr);

      await expect(
        service.create({ rateDate: today, value: 36.5 }),
      ).rejects.toBe(otherErr);
    });
  });

  describe('findAllPaginated', () => {
    it('returns sorted, paginated rates with total count', async () => {
      const docs = [{ id: 'rate-1' }, { id: 'rate-2' }];
      const chainable = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(docs),
      };
      model.find.mockReturnValue(chainable);
      model.countDocuments.mockResolvedValue(2);

      const result = await service.findAllPaginated(1, 10);

      expect(chainable.sort).toHaveBeenCalledWith({ rateDate: -1 });
      expect(chainable.skip).toHaveBeenCalledWith(0);
      expect(chainable.limit).toHaveBeenCalledWith(10);
      expect(result).toEqual({ data: docs, total: 2 });
    });

    it('calculates skip correctly for page 3 with limit 5', async () => {
      const chainable = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      model.find.mockReturnValue(chainable);
      model.countDocuments.mockResolvedValue(0);

      await service.findAllPaginated(3, 5);

      expect(chainable.skip).toHaveBeenCalledWith(10);
      expect(chainable.limit).toHaveBeenCalledWith(5);
    });
  });
});
