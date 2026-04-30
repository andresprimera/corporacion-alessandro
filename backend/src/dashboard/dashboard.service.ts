import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Sale } from '../sales/schemas/sale.schema';
import { Client } from '../clients/schemas/client.schema';
import { CommissionsService } from '../commissions/commissions.service';
import type {
  Currency,
  DashboardCurrencyRevenue,
  DashboardRange,
  DashboardRecentSale,
  DashboardSalesTimeseriesResponse,
  DashboardSummaryResponse,
  DashboardTimeseriesPoint,
  Role,
} from '@base-dashboard/shared';

interface RawCurrencyRevenue {
  currency: string;
  total: number;
}

interface RawTimeseriesRow {
  _id: Date;
  total: number;
  count: number;
}

const TOP_SALES_PEOPLE_LIMIT = 10;
const RECENT_SALES_LIMIT = 10;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectModel(Sale.name) private saleModel: Model<Sale>,
    @InjectModel(Client.name) private clientModel: Model<Client>,
    private commissionsService: CommissionsService,
  ) {}

  async findSummary(actor: {
    userId: string;
    role: Role;
  }): Promise<DashboardSummaryResponse> {
    if (actor.role === 'user') {
      return { role: 'user' };
    }

    const { currentFrom, currentTo, previousFrom } = this.monthWindow(
      new Date(),
    );

    if (actor.role === 'salesPerson') {
      const [
        revenueCurrent,
        revenuePrevious,
        saleCountCurrent,
        saleCountPrevious,
        myClientsCount,
        projectedCommission,
        recentSales,
      ] = await Promise.all([
        this.findCurrencyRevenue(currentFrom, currentTo, actor.userId),
        this.findCurrencyRevenue(previousFrom, currentFrom, actor.userId),
        this.findSaleCount(currentFrom, currentTo, actor.userId),
        this.findSaleCount(previousFrom, currentFrom, actor.userId),
        this.findMyClientsCount(actor.userId),
        this.commissionsService.findReport(
          currentFrom,
          currentTo,
          actor.userId,
        ),
        this.findRecentSalesForSalesPerson(actor.userId, RECENT_SALES_LIMIT),
      ]);

      return {
        role: 'salesPerson',
        revenueCurrent,
        revenuePrevious,
        saleCountCurrent,
        saleCountPrevious,
        myClientsCount,
        projectedCommission,
        recentSales,
      };
    }

    const [
      revenueCurrent,
      revenuePrevious,
      saleCountCurrent,
      saleCountPrevious,
      activeClientsCount,
      activeSalesPeopleCount,
      allTopRows,
    ] = await Promise.all([
      this.findCurrencyRevenue(currentFrom, currentTo),
      this.findCurrencyRevenue(previousFrom, currentFrom),
      this.findSaleCount(currentFrom, currentTo),
      this.findSaleCount(previousFrom, currentFrom),
      this.findActiveClientsCount(),
      this.findActiveSalesPeopleCount(currentFrom, currentTo),
      this.commissionsService.findReport(currentFrom, currentTo),
    ]);

    const topSalesPeople = allTopRows
      .slice()
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, TOP_SALES_PEOPLE_LIMIT);

    return {
      role: 'admin',
      revenueCurrent,
      revenuePrevious,
      saleCountCurrent,
      saleCountPrevious,
      activeClientsCount,
      activeSalesPeopleCount,
      topSalesPeople,
    };
  }

  async findSalesTimeseries(
    actor: { userId: string; role: Role },
    range: DashboardRange,
  ): Promise<DashboardSalesTimeseriesResponse> {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const to = new Date();
    const from = new Date(to.getTime() - days * MS_PER_DAY);
    const salesPersonId =
      actor.role === 'salesPerson' ? actor.userId : undefined;

    const raw = await this.findDailyTimeseries(
      from,
      to,
      'USD',
      salesPersonId,
    );
    const points = this.backfillTimeseries(raw, from, to);

    this.logger.log(
      `Sales timeseries for ${actor.role} ${range}: ${points.length} day(s)`,
    );

    return { range, currency: 'USD', points };
  }

  private monthWindow(now: Date): {
    currentFrom: Date;
    currentTo: Date;
    previousFrom: Date;
  } {
    const currentFrom = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const currentTo = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    );
    const previousFrom = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
    );
    return { currentFrom, currentTo, previousFrom };
  }

  private async findCurrencyRevenue(
    from: Date,
    to: Date,
    salesPersonId?: string,
  ): Promise<DashboardCurrencyRevenue[]> {
    const match: Record<string, unknown> = {
      createdAt: { $gte: from, $lt: to },
    };
    if (salesPersonId) {
      match['soldBy.userId'] = salesPersonId;
    }
    const rows = await this.saleModel.aggregate<RawCurrencyRevenue>([
      { $match: match },
      { $group: { _id: '$currency', total: { $sum: '$totalAmount' } } },
      {
        $project: {
          _id: 0,
          currency: '$_id',
          total: { $round: ['$total', 2] },
        },
      },
      { $sort: { currency: 1 } },
    ]);
    return rows.map((r) => ({
      currency: r.currency as Currency,
      total: r.total,
    }));
  }

  private async findSaleCount(
    from: Date,
    to: Date,
    salesPersonId?: string,
  ): Promise<number> {
    const filter: Record<string, unknown> = {
      createdAt: { $gte: from, $lt: to },
    };
    if (salesPersonId) {
      filter['soldBy.userId'] = salesPersonId;
    }
    return this.saleModel.countDocuments(filter);
  }

  private async findActiveClientsCount(): Promise<number> {
    return this.clientModel.countDocuments({});
  }

  private async findActiveSalesPeopleCount(
    from: Date,
    to: Date,
  ): Promise<number> {
    const ids = await this.saleModel.distinct('soldBy.userId', {
      createdAt: { $gte: from, $lt: to },
    });
    return ids.length;
  }

  private async findMyClientsCount(salesPersonId: string): Promise<number> {
    return this.clientModel.countDocuments({
      salesPersonId: new Types.ObjectId(salesPersonId),
    });
  }

  private async findRecentSalesForSalesPerson(
    salesPersonId: string,
    limit: number,
  ): Promise<DashboardRecentSale[]> {
    const docs = await this.saleModel
      .find({ 'soldBy.userId': salesPersonId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('saleNumber createdAt clientName totalAmount currency');
    return docs.map((d) => ({
      id: d.id as string,
      saleNumber: d.saleNumber,
      createdAt: (d.get('createdAt') as Date).toISOString(),
      clientName: d.clientName,
      totalAmount: d.totalAmount,
      currency: d.currency as Currency,
    }));
  }

  private async findDailyTimeseries(
    from: Date,
    to: Date,
    currency: Currency,
    salesPersonId?: string,
  ): Promise<DashboardTimeseriesPoint[]> {
    const match: Record<string, unknown> = {
      createdAt: { $gte: from, $lt: to },
      currency,
    };
    if (salesPersonId) {
      match['soldBy.userId'] = salesPersonId;
    }

    const rows = await this.saleModel.aggregate<RawTimeseriesRow>([
      { $match: match },
      {
        $group: {
          _id: {
            $dateTrunc: {
              date: '$createdAt',
              unit: 'day',
              timezone: 'UTC',
            },
          },
          total: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return rows.map((r) => ({
      date: r._id.toISOString().slice(0, 10),
      total: Math.round(r.total * 100) / 100,
      count: r.count,
    }));
  }

  private backfillTimeseries(
    points: DashboardTimeseriesPoint[],
    from: Date,
    to: Date,
  ): DashboardTimeseriesPoint[] {
    const byDate = new Map(points.map((p) => [p.date, p]));
    const result: DashboardTimeseriesPoint[] = [];
    const cursor = new Date(
      Date.UTC(
        from.getUTCFullYear(),
        from.getUTCMonth(),
        from.getUTCDate(),
      ),
    );
    const end = new Date(
      Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()),
    );
    while (cursor < end) {
      const key = cursor.toISOString().slice(0, 10);
      result.push(byDate.get(key) ?? { date: key, total: 0, count: 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return result;
  }
}
