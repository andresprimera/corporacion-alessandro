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
import { InventoryService } from './inventory.service';
import { InventoryTransactionDocument } from './schemas/inventory-transaction.schema';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  PopulatedRefBase,
  readPopulatedRef,
} from '../common/utils/populated-ref';
import {
  type InventoryTransaction,
  type PaginatedResponse,
  type ProductKind,
  type ProductStockAggregated,
  type ProductStockByWarehouse,
  paginationQuerySchema,
  type PaginationQuery,
  stockByWarehouseQuerySchema,
  type StockByWarehouseQuery,
  type TransactionType,
} from '@base-dashboard/shared';
import {
  createInventoryTransactionSchema,
  type CreateInventoryTransactionInput,
} from './dto/create-inventory-transaction.dto';
import {
  updateInventoryTransactionSchema,
  type UpdateInventoryTransactionInput,
} from './dto/update-inventory-transaction.dto';

interface PopulatedProduct extends PopulatedRefBase {
  name?: string;
  kind?: string;
}

interface PopulatedWarehouse extends PopulatedRefBase {
  name?: string;
}

function toInventoryTransaction(
  doc: InventoryTransactionDocument,
): InventoryTransaction {
  const product = readPopulatedRef<PopulatedProduct>(doc.productId);
  const warehouse = readPopulatedRef<PopulatedWarehouse>(doc.warehouseId);
  return {
    id: doc.id,
    productId: product.id,
    warehouseId: warehouse.id,
    productName: product.doc?.name,
    productKind: product.doc?.kind as ProductKind | undefined,
    warehouseName: warehouse.doc?.name,
    transactionType: doc.transactionType as TransactionType,
    batch: doc.batch,
    qty: doc.qty,
    notes: doc.notes,
    expirationDate: doc.expirationDate
      ? doc.expirationDate.toISOString()
      : undefined,
    createdBy: {
      userId: doc.createdBy.userId,
      name: doc.createdBy.name,
    },
    createdAt: doc.get('createdAt').toISOString(),
    updatedAt: doc.get('updatedAt').toISOString(),
  };
}

@Controller('inventory-transactions')
@UseGuards(RolesGuard)
@Roles('admin')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get('stock/by-warehouse')
  async findStockByWarehouse(
    @Query(new ZodValidationPipe(stockByWarehouseQuerySchema))
    query: StockByWarehouseQuery,
  ): Promise<PaginatedResponse<ProductStockByWarehouse>> {
    const { data, total } =
      await this.inventoryService.findStockByWarehouse(query);
    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
    };
  }

  @Get('stock/aggregated')
  async findStockAggregated(
    @Query(new ZodValidationPipe(paginationQuerySchema))
    query: PaginationQuery,
  ): Promise<PaginatedResponse<ProductStockAggregated>> {
    const { data, total } =
      await this.inventoryService.findStockAggregated(query);
    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
    };
  }

  @Get()
  async findAll(
    @Query(new ZodValidationPipe(paginationQuerySchema))
    query: PaginationQuery,
  ): Promise<PaginatedResponse<InventoryTransaction>> {
    const { data, total } = await this.inventoryService.findAllPaginated(
      query.page,
      query.limit,
    );
    return {
      data: data.map(toInventoryTransaction),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<InventoryTransaction> {
    const transaction = await this.inventoryService.findById(id);
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    return toInventoryTransaction(transaction);
  }

  @Post()
  async create(
    @CurrentUser() user: { userId: string; name: string },
    @Body(new ZodValidationPipe(createInventoryTransactionSchema))
    dto: CreateInventoryTransactionInput,
  ): Promise<InventoryTransaction> {
    const created = await this.inventoryService.create(dto, {
      userId: user.userId,
      name: user.name,
    });
    return toInventoryTransaction(created);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateInventoryTransactionSchema))
    dto: UpdateInventoryTransactionInput,
  ): Promise<InventoryTransaction> {
    const updated = await this.inventoryService.update(id, dto);
    if (!updated) {
      throw new NotFoundException('Transaction not found');
    }
    return toInventoryTransaction(updated);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.inventoryService.remove(id);
  }
}
