import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UnitsService } from './units.service';
import { UnitDocument } from './schemas/unit.schema';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  type PaginatedResponse,
  type Unit,
  type UnitListQuery,
  type UnitOption,
  unitListQuerySchema,
} from '@base-dashboard/shared';
import {
  createUnitSchema,
  type CreateUnitInput,
} from './dto/create-unit.dto';
import {
  updateUnitSchema,
  type UpdateUnitInput,
} from './dto/update-unit.dto';

function toUnit(doc: UnitDocument): Unit {
  return {
    id: doc.id,
    name: doc.name,
    abbreviation: doc.abbreviation,
    createdAt: doc.get('createdAt').toISOString(),
    updatedAt: doc.get('updatedAt').toISOString(),
  };
}

@Controller('units')
@UseGuards(RolesGuard)
@Roles('admin')
export class UnitsController {
  constructor(private unitsService: UnitsService) {}

  @Get()
  async findAll(
    @Query(new ZodValidationPipe(unitListQuerySchema))
    query: UnitListQuery,
  ): Promise<PaginatedResponse<Unit>> {
    const { data, total } = await this.unitsService.findAllPaginated(
      query.page,
      query.limit,
      { search: query.search },
    );
    return {
      data: data.map(toUnit),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
    };
  }

  @Get('options')
  async findOptions(): Promise<UnitOption[]> {
    return this.unitsService.findOptions();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Unit> {
    const unit = await this.unitsService.findById(id);
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }
    return toUnit(unit);
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createUnitSchema)) dto: CreateUnitInput,
  ): Promise<Unit> {
    const unit = await this.unitsService.create(dto);
    return toUnit(unit);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUnitSchema)) dto: UpdateUnitInput,
  ): Promise<Unit> {
    const updated = await this.unitsService.update(id, dto);
    if (!updated) {
      throw new NotFoundException('Unit not found');
    }
    return toUnit(updated);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.unitsService.remove(id);
  }
}
