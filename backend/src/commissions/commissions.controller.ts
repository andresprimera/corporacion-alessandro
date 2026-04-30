import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CommissionsService } from './commissions.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  type CommissionReportResponse,
  type Role,
} from '@base-dashboard/shared';
import {
  commissionReportQuerySchema,
  type CommissionReportQuery,
} from './dto/commission-report-query.dto';

@Controller('commissions')
@UseGuards(RolesGuard)
@Roles('admin', 'salesPerson')
export class CommissionsController {
  constructor(private commissionsService: CommissionsService) {}

  @Get('report')
  async findReport(
    @Query(new ZodValidationPipe(commissionReportQuerySchema))
    query: CommissionReportQuery,
    @CurrentUser() user: { userId: string; role: Role },
  ): Promise<CommissionReportResponse> {
    const scopedSalesPersonId =
      user.role === 'salesPerson' ? user.userId : undefined;
    const rows = await this.commissionsService.findReport(
      new Date(query.from),
      new Date(query.to),
      scopedSalesPersonId,
    );
    return { from: query.from, to: query.to, rows };
  }
}
