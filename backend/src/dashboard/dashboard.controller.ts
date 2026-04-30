import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  type DashboardSalesTimeseriesResponse,
  type DashboardSummaryResponse,
  type Role,
} from '@base-dashboard/shared';
import {
  dashboardSalesTimeseriesQuerySchema,
  type DashboardSalesTimeseriesQuery,
} from './dto/dashboard-sales-timeseries-query.dto';

@Controller('dashboard')
@UseGuards(RolesGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('summary')
  @Roles('admin', 'salesPerson', 'user')
  async getSummary(
    @CurrentUser() user: { userId: string; role: Role },
  ): Promise<DashboardSummaryResponse> {
    return this.dashboardService.findSummary({
      userId: user.userId,
      role: user.role,
    });
  }

  @Get('sales-timeseries')
  @Roles('admin', 'salesPerson')
  async getSalesTimeseries(
    @Query(new ZodValidationPipe(dashboardSalesTimeseriesQuerySchema))
    query: DashboardSalesTimeseriesQuery,
    @CurrentUser() user: { userId: string; role: Role },
  ): Promise<DashboardSalesTimeseriesResponse> {
    return this.dashboardService.findSalesTimeseries(
      { userId: user.userId, role: user.role },
      query.range,
    );
  }
}
