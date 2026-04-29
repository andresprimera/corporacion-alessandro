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
import { WarehousesService } from './warehouses.service';
import { WarehouseDocument } from './schemas/warehouse.schema';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  PopulatedRefBase,
  readPopulatedRef,
} from '../common/utils/populated-ref';
import {
  type PaginatedResponse,
  type Warehouse,
  type WarehouseOption,
  warehouseListQuerySchema,
  type WarehouseListQuery,
} from '@base-dashboard/shared';
import {
  createWarehouseSchema,
  type CreateWarehouseInput,
} from './dto/create-warehouse.dto';
import {
  updateWarehouseSchema,
  type UpdateWarehouseInput,
} from './dto/update-warehouse.dto';

interface PopulatedCity extends PopulatedRefBase {
  name?: string;
}

function toWarehouse(doc: WarehouseDocument): Warehouse {
  const city = readPopulatedRef<PopulatedCity>(doc.cityId);
  return {
    id: doc.id,
    name: doc.name,
    cityId: city.id,
    cityName: city.doc?.name,
    address: doc.address,
    isActive: doc.isActive,
    createdAt: doc.get('createdAt').toISOString(),
    updatedAt: doc.get('updatedAt').toISOString(),
  };
}

@Controller('warehouses')
@UseGuards(RolesGuard)
@Roles('admin')
export class WarehousesController {
  constructor(private warehousesService: WarehousesService) {}

  @Get()
  async findAll(
    @Query(new ZodValidationPipe(warehouseListQuerySchema))
    query: WarehouseListQuery,
  ): Promise<PaginatedResponse<Warehouse>> {
    const { data, total } = await this.warehousesService.findAllPaginated(
      query.page,
      query.limit,
      { onlyActive: query.onlyActive },
    );
    return {
      data: data.map(toWarehouse),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
    };
  }

  @Get('options')
  @Roles('admin', 'salesPerson')
  async findOptions(): Promise<WarehouseOption[]> {
    return this.warehousesService.findActiveOptions();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Warehouse> {
    const warehouse = await this.warehousesService.findById(id);
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }
    return toWarehouse(warehouse);
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createWarehouseSchema))
    dto: CreateWarehouseInput,
  ): Promise<Warehouse> {
    const warehouse = await this.warehousesService.create(dto);
    return toWarehouse(warehouse);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateWarehouseSchema))
    dto: UpdateWarehouseInput,
  ): Promise<Warehouse> {
    const updated = await this.warehousesService.update(id, dto);
    if (!updated) {
      throw new NotFoundException('Warehouse not found');
    }
    return toWarehouse(updated);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.warehousesService.remove(id);
  }
}
