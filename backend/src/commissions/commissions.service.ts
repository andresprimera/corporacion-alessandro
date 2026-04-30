import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Sale } from '../sales/schemas/sale.schema';
import type {
  CommissionReportRow,
  Currency,
} from '@base-dashboard/shared';

const DEFAULT_COMMISSION_PERCENTAGE = 3;

interface RawReportRow {
  salesPersonId: string;
  salesPersonName: string;
  currency: string;
  totalAmount: number;
  saleCount: number;
  commissionPercentage: number;
  commissionAmount: number;
}

@Injectable()
export class CommissionsService {
  private readonly logger = new Logger(CommissionsService.name);

  constructor(@InjectModel(Sale.name) private saleModel: Model<Sale>) {}

  async findReport(
    from: Date,
    to: Date,
    salesPersonId?: string,
  ): Promise<CommissionReportRow[]> {
    if (from >= to) {
      throw new BadRequestException('"from" must be earlier than "to"');
    }

    const match: Record<string, unknown> = {
      createdAt: { $gte: from, $lt: to },
    };
    if (salesPersonId) {
      match['soldBy.userId'] = salesPersonId;
    }

    const rows = await this.saleModel.aggregate<RawReportRow>([
      { $match: match },
      {
        $group: {
          _id: { userId: '$soldBy.userId', currency: '$currency' },
          totalAmount: { $sum: '$totalAmount' },
          saleCount: { $sum: 1 },
        },
      },
      { $addFields: { _userObjectId: { $toObjectId: '$_id.userId' } } },
      {
        $lookup: {
          from: 'users',
          localField: '_userObjectId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          salesPersonId: '$_id.userId',
          salesPersonName: '$user.name',
          currency: '$_id.currency',
          totalAmount: { $round: ['$totalAmount', 2] },
          saleCount: 1,
          commissionPercentage: {
            $ifNull: [
              '$user.commissionPercentage',
              DEFAULT_COMMISSION_PERCENTAGE,
            ],
          },
          commissionAmount: {
            $round: [
              {
                $multiply: [
                  '$totalAmount',
                  {
                    $divide: [
                      {
                        $ifNull: [
                          '$user.commissionPercentage',
                          DEFAULT_COMMISSION_PERCENTAGE,
                        ],
                      },
                      100,
                    ],
                  },
                ],
              },
              2,
            ],
          },
        },
      },
      { $sort: { salesPersonName: 1, currency: 1 } },
    ]);

    this.logger.log(
      `Commission report ${from.toISOString()} → ${to.toISOString()} produced ${rows.length} row(s)`,
    );

    return rows.map((r) => ({
      ...r,
      currency: r.currency as Currency,
    }));
  }
}
