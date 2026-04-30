import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { DashboardService } from './dashboard.service';
import { Sale } from '../sales/schemas/sale.schema';
import { Client } from '../clients/schemas/client.schema';
import { CommissionsService } from '../commissions/commissions.service';
import type { CommissionReportRow } from '@base-dashboard/shared';

interface PipelineStage {
  $match?: Record<string, unknown>;
  $group?: unknown;
  $project?: unknown;
  $sort?: unknown;
}

describe('DashboardService', () => {
  let service: DashboardService;
  let saleModel: Record<string, jest.Mock>;
  let clientModel: Record<string, jest.Mock>;
  let commissionsService: { findReport: jest.Mock };
  let saleFindChain: {
    sort: jest.Mock;
    limit: jest.Mock;
    select: jest.Mock;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    saleFindChain = {
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue([]),
    };

    saleModel = {
      aggregate: jest.fn().mockResolvedValue([]),
      countDocuments: jest.fn().mockResolvedValue(0),
      distinct: jest.fn().mockResolvedValue([]),
      find: jest.fn().mockReturnValue(saleFindChain),
    };

    clientModel = {
      countDocuments: jest.fn().mockResolvedValue(0),
    };

    commissionsService = {
      findReport: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: getModelToken(Sale.name), useValue: saleModel },
        { provide: getModelToken(Client.name), useValue: clientModel },
        { provide: CommissionsService, useValue: commissionsService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  describe('findSummary', () => {
    it('returns the user shape and calls no DB methods when role is user', async () => {
      const result = await service.findSummary({
        userId: 'u-1',
        role: 'user',
      });

      expect(result).toEqual({ role: 'user' });
      expect(saleModel.aggregate).not.toHaveBeenCalled();
      expect(saleModel.countDocuments).not.toHaveBeenCalled();
      expect(saleModel.distinct).not.toHaveBeenCalled();
      expect(saleModel.find).not.toHaveBeenCalled();
      expect(clientModel.countDocuments).not.toHaveBeenCalled();
      expect(commissionsService.findReport).not.toHaveBeenCalled();
    });

    it('returns the salesPerson shape with all expected fields', async () => {
      saleModel.aggregate.mockResolvedValue([
        { currency: 'USD', total: 1500 },
      ]);
      saleModel.countDocuments.mockResolvedValue(7);
      clientModel.countDocuments.mockResolvedValue(3);
      commissionsService.findReport.mockResolvedValue([]);
      saleFindChain.select.mockResolvedValue([]);

      const result = await service.findSummary({
        userId: '507f1f77bcf86cd799439011',
        role: 'salesPerson',
      });

      if (result.role !== 'salesPerson') {
        throw new Error('expected salesPerson payload');
      }
      expect(result.role).toBe('salesPerson');
      expect(result.revenueCurrent).toEqual([
        { currency: 'USD', total: 1500 },
      ]);
      expect(result.revenuePrevious).toEqual([
        { currency: 'USD', total: 1500 },
      ]);
      expect(result.saleCountCurrent).toBe(7);
      expect(result.saleCountPrevious).toBe(7);
      expect(result.myClientsCount).toBe(3);
      expect(result.projectedCommission).toEqual([]);
      expect(result.recentSales).toEqual([]);
    });

    it('scopes salesPerson queries by userId', async () => {
      await service.findSummary({ userId: '507f1f77bcf86cd799439011', role: 'salesPerson' });

      expect(commissionsService.findReport).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
        '507f1f77bcf86cd799439011',
      );
      const aggregateCalls = saleModel.aggregate.mock.calls as Array<
        [PipelineStage[]]
      >;
      expect(aggregateCalls.length).toBeGreaterThan(0);
      for (const [pipeline] of aggregateCalls) {
        const match = pipeline[0].$match ?? {};
        expect(match['soldBy.userId']).toBe('507f1f77bcf86cd799439011');
      }
      const countCalls = saleModel.countDocuments.mock.calls as Array<
        [Record<string, unknown>]
      >;
      for (const [filter] of countCalls) {
        expect(filter['soldBy.userId']).toBe('507f1f77bcf86cd799439011');
      }
    });

    it('does not scope admin queries by userId', async () => {
      await service.findSummary({ userId: 'admin-1', role: 'admin' });

      expect(commissionsService.findReport).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
      );
      const aggregateCalls = saleModel.aggregate.mock.calls as Array<
        [PipelineStage[]]
      >;
      for (const [pipeline] of aggregateCalls) {
        const match = pipeline[0].$match ?? {};
        expect(match['soldBy.userId']).toBeUndefined();
      }
    });

    it('sorts topSalesPeople by totalAmount desc and caps at 10', async () => {
      const fixture: CommissionReportRow[] = Array.from(
        { length: 12 },
        (_, i) => ({
          salesPersonId: `sp-${i}`,
          salesPersonName: `SP ${i}`,
          currency: 'USD',
          totalAmount: (i + 1) * 100,
          saleCount: i + 1,
          commissionPercentage: 3,
          commissionAmount: (i + 1) * 3,
        }),
      );
      commissionsService.findReport.mockResolvedValue(fixture);

      const result = await service.findSummary({
        userId: 'admin-1',
        role: 'admin',
      });

      if (result.role !== 'admin') {
        throw new Error('expected admin payload');
      }
      expect(result.topSalesPeople).toHaveLength(10);
      const totals = result.topSalesPeople.map((r) => r.totalAmount);
      const sorted = totals.slice().sort((a, b) => b - a);
      expect(totals).toEqual(sorted);
      expect(totals[0]).toBe(1200);
      expect(totals[9]).toBe(300);
    });
  });

  describe('findSalesTimeseries', () => {
    it('builds a 7-day window for range=7d', async () => {
      const before = Date.now();
      await service.findSalesTimeseries(
        { userId: 'admin-1', role: 'admin' },
        '7d',
      );
      const after = Date.now();

      const pipeline = saleModel.aggregate.mock
        .calls[0][0] as PipelineStage[];
      const match = pipeline[0].$match as { createdAt: { $gte: Date } };
      const gteMs = match.createdAt.$gte.getTime();
      const expectedMin = before - 7 * 24 * 60 * 60 * 1000 - 1000;
      const expectedMax = after - 7 * 24 * 60 * 60 * 1000 + 1000;
      expect(gteMs).toBeGreaterThanOrEqual(expectedMin);
      expect(gteMs).toBeLessThanOrEqual(expectedMax);
    });

    it('hard-codes USD in both the $match and the response', async () => {
      const result = await service.findSalesTimeseries(
        { userId: 'admin-1', role: 'admin' },
        '30d',
      );

      const pipeline = saleModel.aggregate.mock
        .calls[0][0] as PipelineStage[];
      const match = pipeline[0].$match as { currency: string };
      expect(match.currency).toBe('USD');
      expect(result.currency).toBe('USD');
    });

    it('scopes by userId when role is salesPerson', async () => {
      await service.findSalesTimeseries(
        { userId: '507f1f77bcf86cd799439011', role: 'salesPerson' },
        '30d',
      );

      const pipeline = saleModel.aggregate.mock
        .calls[0][0] as PipelineStage[];
      const match = pipeline[0].$match as Record<string, unknown>;
      expect(match['soldBy.userId']).toBe('507f1f77bcf86cd799439011');
    });

    it('does not scope by userId when role is admin', async () => {
      await service.findSalesTimeseries(
        { userId: 'admin-1', role: 'admin' },
        '30d',
      );

      const pipeline = saleModel.aggregate.mock
        .calls[0][0] as PipelineStage[];
      const match = pipeline[0].$match as Record<string, unknown>;
      expect(match['soldBy.userId']).toBeUndefined();
    });

    it('returns 7 zero-points when range=7d and aggregate is empty', async () => {
      saleModel.aggregate.mockResolvedValue([]);

      const result = await service.findSalesTimeseries(
        { userId: 'admin-1', role: 'admin' },
        '7d',
      );

      expect(result.points).toHaveLength(7);
      for (const p of result.points) {
        expect(p.total).toBe(0);
        expect(p.count).toBe(0);
        expect(p.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it('preserves real values for matched dates and zero-fills the rest', async () => {
      // Produce a date 3 days ago at midnight UTC
      const now = new Date();
      const threeDaysAgo = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() - 3,
        ),
      );
      saleModel.aggregate.mockResolvedValue([
        { _id: threeDaysAgo, total: 250, count: 2 },
      ]);

      const result = await service.findSalesTimeseries(
        { userId: 'admin-1', role: 'admin' },
        '7d',
      );

      const targetKey = threeDaysAgo.toISOString().slice(0, 10);
      const matched = result.points.find((p) => p.date === targetKey);
      expect(matched).toEqual({
        date: targetKey,
        total: 250,
        count: 2,
      });
      const others = result.points.filter((p) => p.date !== targetKey);
      for (const p of others) {
        expect(p.total).toBe(0);
        expect(p.count).toBe(0);
      }
    });
  });
});
