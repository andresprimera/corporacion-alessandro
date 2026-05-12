import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import PDFDocument from 'pdfkit';
import { Sale, SaleDocument } from './schemas/sale.schema';
import { ProductsService } from '../products/products.service';
import { WarehousesService } from '../warehouses/warehouses.service';
import { InventoryService } from '../inventory/inventory.service';
import { ClientsService } from '../clients/clients.service';
import { StorageService } from '../services/storage/storage.service';
import { isDuplicateKeyError } from '../common/utils/mongo-errors';
import {
  PopulatedRefBase,
  readPopulatedRef,
} from '../common/utils/populated-ref';
import type {
  CreateSaleInput,
  Role,
  SaleSoldBy,
  SaleStatus,
  SubmitPaymentInput,
  UpdateSaleInput,
} from '@base-dashboard/shared';

interface ResolvedAllocation {
  warehouseId: string;
  warehouseName: string;
  qty: number;
}

interface ResolvedEnteredUnit {
  unitId: string;
  name: string;
  abbreviation: string;
}

interface ResolvedItem {
  productId: string;
  productName: string;
  productKind: string;
  requestedQty: number;
  unitPrice: number;
  currency: string;
  enteredQty: number;
  enteredUnit: ResolvedEnteredUnit;
  unitsPerPackageAtEntry?: number;
  allocations: ResolvedAllocation[];
}

interface PopulatedCity extends PopulatedRefBase {
  name?: string;
}

interface PopulatedUnit extends PopulatedRefBase {
  name?: string;
  abbreviation?: string;
}

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    @InjectModel(Sale.name) private saleModel: Model<Sale>,
    private productsService: ProductsService,
    private warehousesService: WarehousesService,
    private inventoryService: InventoryService,
    private clientsService: ClientsService,
    private configService: ConfigService,
    private storageService: StorageService,
  ) {}

  async generateDeliveryOrderPdf(
    id: string,
    actor: { userId: string; role: Role },
  ): Promise<{ filename: string; buffer: Buffer }> {
    const sale = await this.assertCanPrint(id, actor);
    const client = await this.clientsService.findById(sale.clientId.toString());
    if (!client) {
      throw new NotFoundException('Client not found');
    }
    const cityName = readPopulatedRef<PopulatedCity>(client.cityId).doc?.name;
    const buffer = await this.buildPdf((doc) =>
      this.renderDeliveryOrder(doc, sale, cityName),
    );
    return {
      filename: `orden-entrega-${sale.saleNumber}.pdf`,
      buffer,
    };
  }

  async generateInvoicePdf(
    id: string,
    actor: { userId: string; role: Role },
  ): Promise<{ filename: string; buffer: Buffer }> {
    const sale = await this.assertCanPrint(id, actor);
    const client = await this.clientsService.findById(sale.clientId.toString());
    if (!client) {
      throw new NotFoundException('Client not found');
    }
    const cityName = readPopulatedRef<PopulatedCity>(client.cityId).doc?.name;
    const buffer = await this.buildPdf((doc) =>
      this.renderInvoice(doc, sale, client, cityName),
    );
    return {
      filename: `factura-${sale.saleNumber}.pdf`,
      buffer,
    };
  }

  private buildPdf(
    render: (doc: PDFKit.PDFDocument) => void,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      render(doc);
      doc.end();
    });
  }

  private async assertCanPrint(
    id: string,
    actor: { userId: string; role: Role },
  ): Promise<SaleDocument> {
    const sale = await this.findById(id);
    if (!sale) {
      throw new NotFoundException('Sale not found');
    }
    if (actor.role !== 'admin' && sale.soldBy.userId !== actor.userId) {
      throw new ForbiddenException('Not allowed to print this sale');
    }
    return sale;
  }

  private companyInfo(): {
    name: string;
    rif: string;
    address: string;
    phone: string;
  } {
    return {
      name: this.configService.getOrThrow<string>('COMPANY_NAME'),
      rif: this.configService.getOrThrow<string>('COMPANY_RIF'),
      address: this.configService.get<string>('COMPANY_ADDRESS') ?? '',
      phone: this.configService.get<string>('COMPANY_PHONE') ?? '',
    };
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  private displayQty(item: SaleDocument['items'][number]): string {
    if (item.enteredQty != null && item.enteredUnit?.abbreviation) {
      return `${item.enteredQty} ${item.enteredUnit.abbreviation}`;
    }
    return String(item.requestedQty);
  }

  private displayUnitPrice(item: SaleDocument['items'][number]): number {
    if (item.unitsPerPackageAtEntry && item.unitsPerPackageAtEntry > 1) {
      return item.unitPrice * item.unitsPerPackageAtEntry;
    }
    return item.unitPrice;
  }

  private renderDeliveryOrder(
    doc: PDFKit.PDFDocument,
    sale: SaleDocument,
    cityName: string | undefined,
  ): void {
    const company = this.companyInfo();
    const createdAt = sale.get('createdAt') as Date;

    doc.font('Helvetica-Bold').fontSize(18).text(company.name);
    if (company.address) doc.font('Helvetica').fontSize(10).text(company.address);
    if (company.phone) doc.fontSize(10).text(`Tel: ${company.phone}`);
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold').fontSize(16).text('ORDEN DE ENTREGA', {
      align: 'right',
    });
    doc
      .font('Helvetica')
      .fontSize(11)
      .text(`N°: ${sale.saleNumber}`, { align: 'right' })
      .text(`Fecha: ${this.formatDate(createdAt)}`, { align: 'right' });

    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
    doc.moveDown();

    doc.font('Helvetica-Bold').fontSize(11).text('Cliente:');
    doc.font('Helvetica').fontSize(10).text(sale.clientName);
    if (cityName) {
      doc.fontSize(10).text(`Ciudad: ${cityName}`);
    }
    doc.moveDown();

    doc.font('Helvetica-Bold').fontSize(11).text('Productos a entregar:');
    doc.moveDown(0.3);

    const tableTop = doc.y;
    const colProduct = 50;
    const colQty = 320;
    const colWarehouse = 380;
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Producto', colProduct, tableTop);
    doc.text('Cant.', colQty, tableTop);
    doc.text('Almacén(es)', colWarehouse, tableTop);
    doc.moveTo(50, tableTop + 15).lineTo(562, tableTop + 15).stroke();

    let y = tableTop + 22;
    doc.font('Helvetica').fontSize(10);
    for (const item of sale.items) {
      const warehouses = item.allocations
        .map((a) => `${a.warehouseName} (${a.qty})`)
        .join(', ');
      doc.text(item.productName, colProduct, y, { width: 260 });
      doc.text(this.displayQty(item), colQty, y);
      doc.text(warehouses, colWarehouse, y, { width: 180 });
      y = doc.y + 8;
    }

    doc.moveDown(2);
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(`Total unidades: ${sale.totalQty}`);
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(10).text(`Vendido por: ${sale.soldBy.name}`);

    if (sale.notes) {
      doc.moveDown();
      doc.font('Helvetica-Bold').fontSize(10).text('Notas:');
      doc.font('Helvetica').fontSize(10).text(sale.notes);
    }

    doc.moveDown(3);
    const sigY = doc.y;
    doc.moveTo(80, sigY).lineTo(260, sigY).stroke();
    doc.moveTo(330, sigY).lineTo(510, sigY).stroke();
    doc.font('Helvetica').fontSize(9);
    doc.text('Entregado por', 80, sigY + 5, { width: 180, align: 'center' });
    doc.text('Recibido por', 330, sigY + 5, { width: 180, align: 'center' });
  }

  private renderInvoice(
    doc: PDFKit.PDFDocument,
    sale: SaleDocument,
    client: {
      name: string;
      rif: string;
      address: string;
      phone: string;
    },
    cityName: string | undefined,
  ): void {
    const company = this.companyInfo();
    const createdAt = sale.get('createdAt') as Date;

    doc.font('Helvetica-Bold').fontSize(18).text(company.name);
    doc.font('Helvetica').fontSize(10).text(`RIF: ${company.rif}`);
    if (company.address) doc.fontSize(10).text(company.address);
    if (company.phone) doc.fontSize(10).text(`Tel: ${company.phone}`);
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold').fontSize(16).text('FACTURA', { align: 'right' });
    doc
      .font('Helvetica')
      .fontSize(11)
      .text(`N°: ${sale.saleNumber}`, { align: 'right' })
      .text(`Fecha: ${this.formatDate(createdAt)}`, { align: 'right' });

    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
    doc.moveDown();

    doc.font('Helvetica-Bold').fontSize(11).text('Cliente:');
    doc.font('Helvetica').fontSize(10).text(client.name);
    doc.fontSize(10).text(`RIF: ${client.rif}`);
    doc.fontSize(10).text(client.address);
    doc.fontSize(10).text(`Tel: ${client.phone}`);
    if (cityName) {
      doc.fontSize(10).text(`Ciudad: ${cityName}`);
    }
    doc.moveDown();

    const tableTop = doc.y;
    const colProduct = 50;
    const colQty = 300;
    const colPrice = 360;
    const colTotal = 470;
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Producto', colProduct, tableTop);
    doc.text('Cant.', colQty, tableTop, { width: 50, align: 'right' });
    doc.text('Precio', colPrice, tableTop, { width: 100, align: 'right' });
    doc.text('Total', colTotal, tableTop, { width: 90, align: 'right' });
    doc.moveTo(50, tableTop + 15).lineTo(562, tableTop + 15).stroke();

    let y = tableTop + 22;
    doc.font('Helvetica').fontSize(10);
    for (const item of sale.items) {
      const lineTotal = item.unitPrice * item.requestedQty;
      const displayPrice = this.displayUnitPrice(item);
      doc.text(item.productName, colProduct, y, { width: 240 });
      doc.text(this.displayQty(item), colQty, y, {
        width: 50,
        align: 'right',
      });
      doc.text(this.formatCurrency(displayPrice, item.currency), colPrice, y, {
        width: 100,
        align: 'right',
      });
      doc.text(this.formatCurrency(lineTotal, item.currency), colTotal, y, {
        width: 90,
        align: 'right',
      });
      y = doc.y + 8;
    }

    doc.moveTo(360, y + 4).lineTo(562, y + 4).stroke();
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .text('Total:', colPrice, y + 12, { width: 100, align: 'right' });
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(this.formatCurrency(sale.totalAmount, sale.currency), colTotal, y + 12, {
        width: 90,
        align: 'right',
      });

    if (sale.notes) {
      doc.moveDown(3);
      doc.font('Helvetica-Bold').fontSize(10).text('Notas:', 50);
      doc.font('Helvetica').fontSize(10).text(sale.notes);
    }

    doc.moveDown(2);
    doc.font('Helvetica').fontSize(10).text(`Vendido por: ${sale.soldBy.name}`, 50);
  }

  async create(
    dto: CreateSaleInput,
    soldBy: SaleSoldBy,
    actor: { role: Role },
  ): Promise<SaleDocument> {
    const client = await this.clientsService.findById(dto.clientId);
    if (!client) {
      throw new NotFoundException('Client not found');
    }
    if (
      actor.role === 'salesPerson' &&
      readPopulatedRef(client.salesPersonId).id !== soldBy.userId
    ) {
      throw new ForbiddenException(
        'Cannot use a client from another sales person',
      );
    }

    const productInfos = await Promise.all(
      dto.items.map(async (item) => {
        const product = await this.productsService.findById(item.productId);
        if (!product) {
          throw new NotFoundException(`Product not found: ${item.productId}`);
        }
        const resolved = this.resolveItemUnit(product, item);
        return {
          productId: item.productId,
          productName: product.name,
          productKind: product.kind,
          currency: product.price.currency,
          requestedQty: resolved.requestedQty,
          unitPrice: item.unitPrice,
          enteredQty: resolved.enteredQty,
          enteredUnit: resolved.enteredUnit,
          unitsPerPackageAtEntry: resolved.unitsPerPackageAtEntry,
        };
      }),
    );

    await this.assertSufficientStock(productInfos);

    const resolvedItems: ResolvedItem[] = [];
    for (const info of productInfos) {
      const allocations = await this.autoAllocate(
        info.productId,
        info.requestedQty,
      );
      resolvedItems.push({ ...info, allocations });
    }

    const totalQty = resolvedItems.reduce(
      (sum, item) => sum + item.requestedQty,
      0,
    );
    const totalAmount = resolvedItems.reduce(
      (sum, item) => sum + item.unitPrice * item.requestedQty,
      0,
    );
    const currency = resolvedItems[0]?.currency ?? 'USD';

    const created = await this.persistSale(
      resolvedItems,
      totalQty,
      totalAmount,
      currency,
      soldBy,
      dto,
      { id: client.id, name: client.name },
    );

    const batch = `SALE-${created.saleNumber}`;
    for (const item of resolvedItems) {
      for (const allocation of item.allocations) {
        await this.inventoryService.create(
          {
            productId: item.productId,
            warehouseId: allocation.warehouseId,
            transactionType: 'outbound',
            batch,
            qty: allocation.qty,
            notes: `Sale ${created.saleNumber}`,
          },
          { userId: soldBy.userId, name: soldBy.name },
          { skipValidation: true },
        );
      }
    }

    this.logger.log(
      `Sale ${created.saleNumber} created by ${soldBy.name} (${totalQty} units, ${totalAmount} ${currency})`,
    );
    return created;
  }

  private resolveItemUnit(
    product: import('../products/schemas/product.schema').ProductDocument,
    item: { enteredQty: number; enteredUnitId: string },
  ): {
    requestedQty: number;
    enteredQty: number;
    enteredUnit: ResolvedEnteredUnit;
    unitsPerPackageAtEntry?: number;
  } {
    const basic = readPopulatedRef<PopulatedUnit>(product.basicUnitId);
    const pkg = product.packageUnitId
      ? readPopulatedRef<PopulatedUnit>(product.packageUnitId)
      : null;

    if (item.enteredUnitId === basic.id) {
      if (!basic.doc?.name || !basic.doc?.abbreviation) {
        throw new BadRequestException(
          `Product "${product.name}" is missing basic-unit metadata`,
        );
      }
      return {
        requestedQty: item.enteredQty,
        enteredQty: item.enteredQty,
        enteredUnit: {
          unitId: basic.id,
          name: basic.doc.name,
          abbreviation: basic.doc.abbreviation,
        },
      };
    }

    if (pkg && item.enteredUnitId === pkg.id) {
      if (!product.unitsPerPackage) {
        throw new BadRequestException(
          `Product "${product.name}" has no units-per-package configured`,
        );
      }
      if (!pkg.doc?.name || !pkg.doc?.abbreviation) {
        throw new BadRequestException(
          `Product "${product.name}" is missing package-unit metadata`,
        );
      }
      return {
        requestedQty: item.enteredQty * product.unitsPerPackage,
        enteredQty: item.enteredQty,
        enteredUnit: {
          unitId: pkg.id,
          name: pkg.doc.name,
          abbreviation: pkg.doc.abbreviation,
        },
        unitsPerPackageAtEntry: product.unitsPerPackage,
      };
    }

    throw new BadRequestException(
      `Entered unit does not belong to product "${product.name}"`,
    );
  }

  private async assertSufficientStock(
    items: { productId: string; productName: string; requestedQty: number }[],
  ): Promise<void> {
    const requested = new Map<
      string,
      { productName: string; qty: number }
    >();
    for (const item of items) {
      const existing = requested.get(item.productId);
      if (existing) {
        existing.qty += item.requestedQty;
      } else {
        requested.set(item.productId, {
          productName: item.productName,
          qty: item.requestedQty,
        });
      }
    }

    for (const [productId, entry] of requested) {
      const available =
        await this.inventoryService.findTotalStockForProduct(productId);
      if (entry.qty > available) {
        throw new BadRequestException(
          `Insufficient stock for "${entry.productName}" (requested ${entry.qty}, available ${available})`,
        );
      }
    }
  }

  private async autoAllocate(
    productId: string,
    requestedQty: number,
  ): Promise<ResolvedAllocation[]> {
    const warehouses = await this.warehousesService.findAllActive();
    const withStock = await Promise.all(
      warehouses.map(async (w) => ({
        id: w.id as string,
        name: w.name,
        available: await this.inventoryService.findAvailableStock(
          productId,
          w.id as string,
        ),
      })),
    );
    withStock.sort(
      (a, b) =>
        b.available - a.available || a.name.localeCompare(b.name),
    );

    const allocations: ResolvedAllocation[] = [];
    let remaining = requestedQty;
    for (const w of withStock) {
      if (remaining <= 0) break;
      if (w.available <= 0) continue;
      const take = Math.min(remaining, w.available);
      allocations.push({
        warehouseId: w.id,
        warehouseName: w.name,
        qty: take,
      });
      remaining -= take;
    }
    if (remaining > 0) {
      throw new BadRequestException(
        'Stock changed during sale creation; please retry',
      );
    }
    return allocations;
  }

  private async persistSale(
    resolvedItems: ResolvedItem[],
    totalQty: number,
    totalAmount: number,
    currency: string,
    soldBy: SaleSoldBy,
    dto: CreateSaleInput,
    client: { id: string; name: string },
    retriesLeft = 3,
  ): Promise<SaleDocument> {
    const saleNumber = await this.generateSaleNumber();
    try {
      return await this.saleModel.create({
        saleNumber,
        clientId: new Types.ObjectId(client.id),
        clientName: client.name,
        notes: dto.notes,
        items: resolvedItems.map((item) => ({
          productId: new Types.ObjectId(item.productId),
          productName: item.productName,
          productKind: item.productKind,
          requestedQty: item.requestedQty,
          unitPrice: item.unitPrice,
          currency: item.currency,
          enteredQty: item.enteredQty,
          enteredUnit: {
            unitId: new Types.ObjectId(item.enteredUnit.unitId),
            name: item.enteredUnit.name,
            abbreviation: item.enteredUnit.abbreviation,
          },
          unitsPerPackageAtEntry: item.unitsPerPackageAtEntry,
          allocations: item.allocations.map((a) => ({
            warehouseId: new Types.ObjectId(a.warehouseId),
            warehouseName: a.warehouseName,
            qty: a.qty,
          })),
        })),
        totalQty,
        totalAmount,
        currency,
        soldBy,
      });
    } catch (err) {
      if (isDuplicateKeyError(err) && retriesLeft > 0) {
        return this.persistSale(
          resolvedItems,
          totalQty,
          totalAmount,
          currency,
          soldBy,
          dto,
          client,
          retriesLeft - 1,
        );
      }
      throw err;
    }
  }

  async findAllPaginated(
    page: number,
    limit: number,
  ): Promise<{ data: SaleDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.saleModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      this.saleModel.countDocuments(),
    ]);
    return { data, total };
  }

  async findById(id: string): Promise<SaleDocument | null> {
    return this.saleModel.findById(id);
  }

  async update(
    id: string,
    dto: UpdateSaleInput,
  ): Promise<SaleDocument | null> {
    return this.saleModel.findByIdAndUpdate(id, dto, { new: true });
  }

  async updateStatus(
    id: string,
    next: 'confirmed' | 'payment_rejected',
  ): Promise<SaleDocument> {
    const sale = await this.saleModel.findById(id);
    if (!sale) {
      throw new NotFoundException('Sale not found');
    }
    const current = sale.status as SaleStatus;
    if (current !== 'paid') {
      throw new BadRequestException(
        `Cannot transition sale from ${current} to ${next}`,
      );
    }
    sale.status = next;
    await sale.save();
    this.logger.log(`Sale ${sale.saleNumber} status changed paid → ${next}`);
    return sale;
  }

  async submitPayment(
    id: string,
    file: Express.Multer.File,
    dto: SubmitPaymentInput,
    actor: { userId: string },
  ): Promise<SaleDocument> {
    const sale = await this.saleModel.findById(id);
    if (!sale) {
      throw new NotFoundException('Sale not found');
    }
    if (sale.soldBy.userId !== actor.userId) {
      throw new ForbiddenException(
        'Not allowed to submit payment for this sale',
      );
    }
    const current = sale.status as SaleStatus;
    if (current !== 'placed' && current !== 'payment_rejected') {
      throw new BadRequestException(
        `Cannot submit payment for a sale in status ${current}`,
      );
    }

    if (sale.paymentProof?.imageKey) {
      try {
        await this.storageService.delete(sale.paymentProof.imageKey);
      } catch (err) {
        this.logger.warn(
          `Failed to delete previous payment proof ${sale.paymentProof.imageKey}: ${(err as Error).message}`,
        );
      }
    }

    const extension = this.extensionFromMime(file.mimetype);
    const uploadResult = await this.storageService.upload(file.buffer, {
      folder: `sales/${sale.id}/payment-proofs`,
      fileName: `${Date.now()}.${extension}`,
      mimeType: file.mimetype,
    });

    sale.paymentProof = {
      imageKey: uploadResult.key,
      imageMimeType: file.mimetype,
      bank: dto.bank,
      paymentType: dto.paymentType,
      paymentNumber: dto.paymentNumber,
      paymentDate: new Date(dto.paymentDate),
      paidAmount: dto.paidAmount,
      submittedAt: new Date(),
    };
    sale.status = 'paid';
    await sale.save();

    this.logger.log(
      `Sale ${sale.saleNumber} payment submitted by ${actor.userId} → paid`,
    );
    return sale;
  }

  async findPaymentProofStream(
    id: string,
    actor: { userId: string; role: Role },
  ): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
    const sale = await this.saleModel.findById(id);
    if (!sale) {
      throw new NotFoundException('Sale not found');
    }
    if (!sale.paymentProof) {
      throw new NotFoundException('Payment proof not found');
    }
    if (actor.role !== 'admin' && sale.soldBy.userId !== actor.userId) {
      throw new ForbiddenException('Not allowed to view this payment proof');
    }
    const buffer = await this.storageService.download(
      sale.paymentProof.imageKey,
    );
    return {
      buffer,
      mimeType: sale.paymentProof.imageMimeType,
      fileName: `payment-proof-${sale.saleNumber}.${this.extensionFromMime(sale.paymentProof.imageMimeType)}`,
    };
  }

  private extensionFromMime(mime: string): string {
    if (mime === 'image/jpeg') return 'jpg';
    if (mime === 'image/png') return 'png';
    if (mime === 'image/webp') return 'webp';
    if (mime === 'application/pdf') return 'pdf';
    return 'bin';
  }

  async remove(id: string): Promise<void> {
    const sale = await this.saleModel.findById(id);
    if (!sale) {
      throw new NotFoundException('Sale not found');
    }
    if (sale.status !== 'placed') {
      throw new BadRequestException('Cannot delete a non-placed sale');
    }

    const reversalBatch = `SALE-REVERSAL-${sale.saleNumber}`;
    for (const item of sale.items) {
      for (const allocation of item.allocations) {
        await this.inventoryService.create(
          {
            productId: item.productId.toString(),
            warehouseId: allocation.warehouseId.toString(),
            transactionType: 'inbound',
            batch: reversalBatch,
            qty: allocation.qty,
            notes: `Reversal of sale ${sale.saleNumber}`,
          },
          { userId: sale.soldBy.userId, name: sale.soldBy.name },
          { skipValidation: true },
        );
      }
    }

    await this.saleModel.findByIdAndDelete(id);
    this.logger.log(`Sale ${sale.saleNumber} reversed and deleted`);
  }

  private async generateSaleNumber(): Promise<string> {
    const year = new Date().getUTCFullYear();
    const yearPrefix = `S-${year}-`;
    const lastInYear = await this.saleModel
      .findOne({ saleNumber: { $regex: `^${yearPrefix}` } })
      .sort({ saleNumber: -1 })
      .select('saleNumber');
    const lastSeq = lastInYear
      ? parseInt(lastInYear.saleNumber.slice(yearPrefix.length), 10)
      : 0;
    const nextSeq = lastSeq + 1;
    return `${yearPrefix}${String(nextSeq).padStart(5, '0')}`;
  }
}
