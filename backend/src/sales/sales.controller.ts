import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseFilePipeBuilder,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SalesService } from './sales.service';
import {
  PaymentProof as PaymentProofDoc,
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
  type PaymentProof,
  type PaymentType,
  type ProductKind,
  type Role,
  type Sale,
  type SaleItem,
  type SaleStatus,
  type WarehouseAllocation,
  saleListQuerySchema,
  type SaleListQuery,
} from '@base-dashboard/shared';
import { createSaleSchema, type CreateSaleInput } from './dto/create-sale.dto';
import { updateSaleSchema, type UpdateSaleInput } from './dto/update-sale.dto';
import {
  updateSaleStatusSchema,
  type UpdateSaleStatusInput,
} from './dto/update-sale-status.dto';
import {
  submitPaymentSchema,
  type SubmitPaymentInput,
} from './dto/submit-payment.dto';

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
    enteredQty: raw.enteredQty,
    enteredUnit: raw.enteredUnit
      ? {
          id: raw.enteredUnit.unitId.toString(),
          name: raw.enteredUnit.name,
          abbreviation: raw.enteredUnit.abbreviation,
        }
      : undefined,
    unitsPerPackageAtEntry: raw.unitsPerPackageAtEntry,
    allocations: raw.allocations.map(toAllocation),
  };
}

function toPaymentProof(raw: PaymentProofDoc): PaymentProof {
  return {
    imageKey: raw.imageKey,
    imageMimeType: raw.imageMimeType,
    bank: raw.bank,
    paymentType: raw.paymentType as PaymentType,
    paymentNumber: raw.paymentNumber,
    paymentDate: raw.paymentDate.toISOString().slice(0, 10),
    submittedAt: raw.submittedAt.toISOString(),
  };
}

function toSale(doc: SaleDocument): Sale {
  return {
    id: doc.id,
    saleNumber: doc.saleNumber,
    clientId: doc.clientId.toString(),
    clientName: doc.clientName,
    notes: doc.notes,
    items: doc.items.map(toItem),
    totalQty: doc.totalQty,
    totalAmount: doc.totalAmount,
    currency: doc.currency as Currency,
    status: doc.status as SaleStatus,
    paymentProof: doc.paymentProof ? toPaymentProof(doc.paymentProof) : undefined,
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

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async updateStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSaleStatusSchema))
    dto: UpdateSaleStatusInput,
  ): Promise<Sale> {
    const updated = await this.salesService.updateStatus(id, dto.status);
    return toSale(updated);
  }

  @Post(':id/payment')
  @UseGuards(RolesGuard)
  @Roles('salesPerson')
  @UseInterceptors(FileInterceptor('image'))
  async submitPayment(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /^(image\/(jpeg|png|webp)|application\/pdf)$/,
        })
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .build({
          errorHttpStatusCode: HttpStatus.BAD_REQUEST,
          fileIsRequired: true,
        }),
    )
    file: Express.Multer.File,
    @Body(new ZodValidationPipe(submitPaymentSchema)) dto: SubmitPaymentInput,
    @CurrentUser() user: { userId: string },
  ): Promise<Sale> {
    const updated = await this.salesService.submitPayment(id, file, dto, {
      userId: user.userId,
    });
    return toSale(updated);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.salesService.remove(id);
  }

  @Get(':id/delivery-order')
  async deliveryOrder(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; role: Role },
  ): Promise<StreamableFile> {
    const { filename, buffer } =
      await this.salesService.generateDeliveryOrderPdf(id, user);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Get(':id/invoice')
  async invoice(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; role: Role },
  ): Promise<StreamableFile> {
    const { filename, buffer } = await this.salesService.generateInvoicePdf(
      id,
      user,
    );
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Get(':id/payment-proof')
  async paymentProof(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; role: Role },
  ): Promise<StreamableFile> {
    const { buffer, mimeType, fileName } =
      await this.salesService.findPaymentProofStream(id, user);
    return new StreamableFile(buffer, {
      type: mimeType,
      disposition: `inline; filename="${fileName}"`,
    });
  }
}
