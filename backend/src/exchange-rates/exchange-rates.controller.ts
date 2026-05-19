import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  createExchangeRateSchema,
  type CreateExchangeRateInput,
  type ExchangeRate,
  type PaginatedResponse,
  paginationQuerySchema,
  type PaginationQuery,
} from '@base-dashboard/shared';
import { ExchangeRatesService } from './exchange-rates.service';
import { toExchangeRate } from './utils/to-exchange-rate';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('exchange-rates')
@UseGuards(RolesGuard)
@Roles('admin')
export class ExchangeRatesController {
  constructor(private exchangeRatesService: ExchangeRatesService) {}

  @Get()
  async findAll(
    @Query(new ZodValidationPipe(paginationQuerySchema))
    query: PaginationQuery,
  ): Promise<PaginatedResponse<ExchangeRate>> {
    const { data, total } = await this.exchangeRatesService.findAllPaginated(
      query.page,
      query.limit,
    );
    return {
      data: data.map(toExchangeRate),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
    };
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createExchangeRateSchema))
    dto: CreateExchangeRateInput,
  ): Promise<ExchangeRate> {
    const doc = await this.exchangeRatesService.create(dto);
    return toExchangeRate(doc);
  }
}
