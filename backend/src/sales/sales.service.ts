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
import { UsersService } from '../users/users.service';
import { CitiesService } from '../cities/cities.service';
import { isDuplicateKeyError } from '../common/utils/mongo-errors';
import { readPopulatedRef } from '../common/utils/populated-ref';
import type {
  CreateSaleInput,
  Role,
  SaleSoldBy,
  UpdateSaleInput,
} from '@base-dashboard/shared';

interface ResolvedAllocation {
  warehouseId: string;
  warehouseName: string;
  qty: number;
}

interface ResolvedItem {
  productId: string;
  productName: string;
  productKind: string;
  requestedQty: number;
  unitPrice: number;
  currency: string;
  allocations: ResolvedAllocation[];
}

interface ResolvedCity {
  id: string;
  name: string;
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
    private usersService: UsersService,
    private citiesService: CitiesService,
    private configService: ConfigService,
  ) {}

  async generateDeliveryOrderPdf(
    id: string,
    actor: { userId: string; role: Role },
  ): Promise<{ filename: string; buffer: Buffer }> {
    const sale = await this.assertCanPrint(id, actor);
    const buffer = await this.buildPdf((doc) =>
      this.renderDeliveryOrder(doc, sale),
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
    const buffer = await this.buildPdf((doc) =>
      this.renderInvoice(doc, sale, client),
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

  private renderDeliveryOrder(
    doc: PDFKit.PDFDocument,
    sale: SaleDocument,
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
    doc.fontSize(10).text(`Ciudad: ${sale.cityName}`);
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
      doc.text(String(item.requestedQty), colQty, y);
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
    doc.fontSize(10).text(`Ciudad: ${sale.cityName}`);
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
      doc.text(item.productName, colProduct, y, { width: 240 });
      doc.text(String(item.requestedQty), colQty, y, {
        width: 50,
        align: 'right',
      });
      doc.text(this.formatCurrency(item.unitPrice, item.currency), colPrice, y, {
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
    const city = await this.resolveCity(dto, soldBy, actor);

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
        return {
          productId: item.productId,
          productName: product.name,
          productKind: product.kind,
          currency: product.price.currency,
          requestedQty: item.requestedQty,
          unitPrice: item.unitPrice,
        };
      }),
    );

    await this.assertSufficientCityStock(productInfos, city);

    const resolvedItems: ResolvedItem[] = [];
    for (const info of productInfos) {
      const allocations = await this.autoAllocate(
        info.productId,
        info.requestedQty,
        city.id,
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
      city,
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
      `Sale ${created.saleNumber} created by ${soldBy.name} in ${city.name} (${totalQty} units, ${totalAmount} ${currency})`,
    );
    return created;
  }

  private async resolveCity(
    dto: CreateSaleInput,
    soldBy: SaleSoldBy,
    actor: { role: Role },
  ): Promise<ResolvedCity> {
    let cityId: string;
    if (actor.role === 'salesPerson') {
      const seller = await this.usersService.findById(soldBy.userId);
      if (!seller?.cityId) {
        throw new BadRequestException('Sales person has no assigned city');
      }
      cityId = readPopulatedRef(seller.cityId).id;
    } else {
      if (!dto.cityId) {
        throw new BadRequestException('City is required');
      }
      cityId = dto.cityId;
    }
    const city = await this.citiesService.findById(cityId);
    if (!city) {
      throw new NotFoundException('City not found');
    }
    if (!city.isActive) {
      throw new BadRequestException('City is inactive');
    }
    return { id: cityId, name: city.name };
  }

  private async assertSufficientCityStock(
    items: { productId: string; productName: string; requestedQty: number }[],
    city: ResolvedCity,
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
      const available = await this.inventoryService.findCityStockForProduct(
        productId,
        city.id,
      );
      if (entry.qty > available) {
        throw new BadRequestException(
          `Insufficient stock for "${entry.productName}" in "${city.name}" (requested ${entry.qty}, available ${available})`,
        );
      }
    }
  }

  private async autoAllocate(
    productId: string,
    requestedQty: number,
    cityId: string,
  ): Promise<ResolvedAllocation[]> {
    const warehouses = await this.warehousesService.findActiveByCity(cityId);
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
    city: ResolvedCity,
    retriesLeft = 3,
  ): Promise<SaleDocument> {
    const saleNumber = await this.generateSaleNumber();
    try {
      return await this.saleModel.create({
        saleNumber,
        cityId: new Types.ObjectId(city.id),
        cityName: city.name,
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
          city,
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

  async remove(id: string): Promise<void> {
    const sale = await this.saleModel.findById(id);
    if (!sale) {
      throw new NotFoundException('Sale not found');
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
