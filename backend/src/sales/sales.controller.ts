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
import { SalesService } from './sales.service';
import {
  SaleDocument,
  SaleItem as SaleItemDoc,
  WarehouseAllocation as WarehouseAllocationDoc,
} from './schemas/sale.schema';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  type Currency,
  type PaginatedResponse,
  type ProductKind,
  type Role,
  type Sale,
  type SaleItem,
  type WarehouseAllocation,
  saleListQuerySchema,
  type SaleListQuery,
} from '@base-dashboard/shared';
import { createSaleSchema, type CreateSaleInput } from './dto/create-sale.dto';
import { updateSaleSchema, type UpdateSaleInput } from './dto/update-sale.dto';

function toAllocation(raw: WarehouseAllocationDoc): WarehouseAllocation {
  return {
    warehouseId: raw.warehouseId.toString(),
    warehouseName: raw.warehouseName,
    qty: raw.qty,
  };
}

function toItem(raw: SaleItemDoc): SaleItem {
  return {
    productId: raw.productId.toString(),
    productName: raw.productName,
    productKind: raw.productKind as ProductKind,
    requestedQty: raw.requestedQty,
    unitPrice: raw.unitPrice,
    currency: raw.currency as Currency,
    allocations: raw.allocations.map(toAllocation),
  };
}

function toSale(doc: SaleDocument): Sale {
  return {
    id: doc.id,
    saleNumber: doc.saleNumber,
    cityId: doc.cityId.toString(),
    cityName: doc.cityName,
    clientId: doc.clientId.toString(),
    clientName: doc.clientName,
    notes: doc.notes,
    items: doc.items.map(toItem),
    totalQty: doc.totalQty,
    totalAmount: doc.totalAmount,
    currency: doc.currency as Currency,
    soldBy: { userId: doc.soldBy.userId, name: doc.soldBy.name },
    createdAt: doc.get('createdAt').toISOString(),
    updatedAt: doc.get('updatedAt').toISOString(),
  };
}

@Controller('sales')
@UseGuards(RolesGuard)
@Roles('admin', 'salesPerson')
export class SalesController {
  constructor(private salesService: SalesService) {}

  @Get()
  async findAll(
    @Query(new ZodValidationPipe(saleListQuerySchema))
    query: SaleListQuery,
  ): Promise<PaginatedResponse<Sale>> {
    const { data, total } = await this.salesService.findAllPaginated(
      query.page,
      query.limit,
    );
    return {
      data: data.map(toSale),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Sale> {
    const sale = await this.salesService.findById(id);
    if (!sale) {
      throw new NotFoundException('Sale not found');
    }
    return toSale(sale);
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createSaleSchema)) dto: CreateSaleInput,
    @CurrentUser() user: { userId: string; name: string; role: Role },
  ): Promise<Sale> {
    const sale = await this.salesService.create(
      dto,
      { userId: user.userId, name: user.name },
      { role: user.role },
    );
    return toSale(sale);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSaleSchema)) dto: UpdateSaleInput,
  ): Promise<Sale> {
    const updated = await this.salesService.update(id, dto);
    if (!updated) {
      throw new NotFoundException('Sale not found');
    }
    return toSale(updated);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.salesService.remove(id);
  }
}
