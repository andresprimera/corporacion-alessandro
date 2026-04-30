import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { CommissionsService } from './commissions.service';
import { Sale } from '../sales/schemas/sale.schema';

describe('CommissionsService', () => {
  let service: CommissionsService;
  let saleModel: Record<string, jest.Mock>;

  beforeEach(async () => {
    jest.clearAllMocks();
    saleModel = {
      aggregate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionsService,
        { provide: getModelToken(Sale.name), useValue: saleModel },
      ],
    }).compile();

    service = module.get<CommissionsService>(CommissionsService);
  });

  describe('findReport', () => {
    it('throws BadRequestException when from is not earlier than to', async () => {
      const same = new Date('2026-04-01T00:00:00.000Z');

      await expect(service.findReport(same, same)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(saleModel.aggregate).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when from is after to', async () => {
      const from = new Date('2026-05-01T00:00:00.000Z');
      const to = new Date('2026-04-01T00:00:00.000Z');

      await expect(service.findReport(from, to)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(saleModel.aggregate).not.toHaveBeenCalled();
    });

    it('runs the aggregation with the expected $match window', async () => {
      const from = new Date('2026-04-01T00:00:00.000Z');
      const to = new Date('2026-05-01T00:00:00.000Z');
      saleModel.aggregate.mockResolvedValue([]);

      await service.findReport(from, to);

      expect(saleModel.aggregate).toHaveBeenCalledTimes(1);
      const pipeline = saleModel.aggregate.mock.calls[0][0];
      expect(pipeline[0]).toEqual({
        $match: { createdAt: { $gte: from, $lt: to } },
      });
    });

    it('scopes the aggregation to a specific sales person when an id is provided', async () => {
      const from = new Date('2026-04-01T00:00:00.000Z');
      const to = new Date('2026-05-01T00:00:00.000Z');
      saleModel.aggregate.mockResolvedValue([]);

      await service.findReport(from, to, 'sp-123');

      const pipeline = saleModel.aggregate.mock.calls[0][0];
      expect(pipeline[0]).toEqual({
        $match: {
          createdAt: { $gte: from, $lt: to },
          'soldBy.userId': 'sp-123',
        },
      });
    });

    it('returns mapped rows with the Currency cast applied', async () => {
      const fixture = [
        {
          salesPersonId: 'user-1',
          salesPersonName: 'Alice',
          currency: 'USD',
          totalAmount: 1000,
          saleCount: 4,
          commissionPercentage: 3,
          commissionAmount: 30,
        },
        {
          salesPersonId: 'user-1',
          salesPersonName: 'Alice',
          currency: 'VES',
          totalAmount: 250,
          saleCount: 1,
          commissionPercentage: 3,
          commissionAmount: 7.5,
        },
      ];
      saleModel.aggregate.mockResolvedValue(fixture);

      const from = new Date('2026-04-01T00:00:00.000Z');
      const to = new Date('2026-05-01T00:00:00.000Z');
      const rows = await service.findReport(from, to);

      expect(rows).toEqual(fixture);
    });

    it('returns an empty array when the aggregation yields no rows', async () => {
      saleModel.aggregate.mockResolvedValue([]);
      const from = new Date('2026-04-01T00:00:00.000Z');
      const to = new Date('2026-05-01T00:00:00.000Z');

      const rows = await service.findReport(from, to);

      expect(rows).toEqual([]);
    });
  });
});
