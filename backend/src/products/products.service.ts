import {
  BadRequestException,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types, isValidObjectId } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { UnitsService } from '../units/units.service';
import { PresentationsService } from '../presentations/presentations.service';
import { LiquorTypesService } from '../liquor-types/liquor-types.service';
import type {
  CreateProductInput,
  ProductListQuery,
  UpdateProductInput,
} from '@base-dashboard/shared';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const REF_POPULATE = [
  { path: 'basicUnitId', select: 'name abbreviation' },
  { path: 'packageUnitId', select: 'name abbreviation' },
  { path: 'presentationId', select: 'name abbreviation' },
  { path: 'liquorTypeId', select: 'name abbreviation' },
];

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>,
    @Inject(forwardRef(() => UnitsService))
    private unitsService: UnitsService,
    @Inject(forwardRef(() => PresentationsService))
    private presentationsService: PresentationsService,
    @Inject(forwardRef(() => LiquorTypesService))
    private liquorTypesService: LiquorTypesService,
  ) {}

  private async assertUnits(
    basicUnitId: string,
    packageUnitId?: string,
  ): Promise<void> {
    const basicExists = await this.unitsService.existsById(basicUnitId);
    if (!basicExists) {
      throw new BadRequestException('Basic unit not found');
    }
    if (packageUnitId) {
      const packageExists = await this.unitsService.existsById(packageUnitId);
      if (!packageExists) {
        throw new BadRequestException('Package unit not found');
      }
    }
  }

  private async assertPresentation(presentationId?: string): Promise<void> {
    if (!presentationId) return;
    const exists = await this.presentationsService.existsById(presentationId);
    if (!exists) {
      throw new BadRequestException('Presentation not found');
    }
  }

  private async assertLiquorType(liquorTypeId?: string): Promise<void> {
    if (!liquorTypeId) return;
    const exists = await this.liquorTypesService.existsById(liquorTypeId);
    if (!exists) {
      throw new BadRequestException('Liquor type not found');
    }
  }

  async create(data: CreateProductInput): Promise<ProductDocument> {
    await this.assertUnits(data.basicUnitId, data.packageUnitId);
    if (data.kind === 'liquor') {
      await this.assertPresentation(data.presentationId);
      await this.assertLiquorType(data.liquorTypeId);
    }
    const created = await this.productModel.create({
      ...data,
      basicUnitId: new Types.ObjectId(data.basicUnitId),
      packageUnitId: data.packageUnitId
        ? new Types.ObjectId(data.packageUnitId)
        : undefined,
      presentationId:
        data.kind === 'liquor'
          ? new Types.ObjectId(data.presentationId)
          : undefined,
      liquorTypeId:
        data.kind === 'liquor'
          ? new Types.ObjectId(data.liquorTypeId)
          : undefined,
    });
    await created.populate(REF_POPULATE);
    return created;
  }

  async findAllPaginated(
    query: ProductListQuery,
  ): Promise<{ data: ProductDocument[]; total: number }> {
    const { page, limit, kind, liquorTypeId, minPrice, maxPrice, search } =
      query;
    const filter: FilterQuery<Product> = {};

    if (kind) filter.kind = kind;
    if (liquorTypeId) {
      filter.kind = 'liquor';
      filter.liquorTypeId = new Types.ObjectId(liquorTypeId);
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceRange: { $gte?: number; $lte?: number } = {};
      if (minPrice !== undefined) priceRange.$gte = minPrice;
      if (maxPrice !== undefined) priceRange.$lte = maxPrice;
      filter['price.value'] = priceRange;
    }
    if (search) {
      filter.name = { $regex: escapeRegex(search), $options: 'i' };
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.productModel
        .find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .populate(REF_POPULATE),
      this.productModel.countDocuments(filter),
    ]);
    return { data, total };
  }

  async findById(id: string): Promise<ProductDocument | null> {
    return this.productModel.findById(id).populate(REF_POPULATE);
  }

  async update(
    id: string,
    data: UpdateProductInput,
  ): Promise<ProductDocument | null> {
    await this.assertUnits(data.basicUnitId, data.packageUnitId);
    if (data.kind === 'liquor') {
      await this.assertPresentation(data.presentationId);
      await this.assertLiquorType(data.liquorTypeId);
    }
    const update: Record<string, unknown> = {
      ...data,
      basicUnitId: new Types.ObjectId(data.basicUnitId),
      packageUnitId: data.packageUnitId
        ? new Types.ObjectId(data.packageUnitId)
        : undefined,
      presentationId:
        data.kind === 'liquor'
          ? new Types.ObjectId(data.presentationId)
          : undefined,
      liquorTypeId:
        data.kind === 'liquor'
          ? new Types.ObjectId(data.liquorTypeId)
          : undefined,
    };
    return this.productModel
      .findByIdAndUpdate(id, update, { new: true })
      .populate(REF_POPULATE);
  }

  async remove(id: string): Promise<void> {
    await this.productModel.findByIdAndDelete(id);
  }

  async findOptions(): Promise<ProductDocument[]> {
    return this.productModel
      .find(
        {},
        {
          name: 1,
          kind: 1,
          price: 1,
          basicUnitId: 1,
          packageUnitId: 1,
          unitsPerPackage: 1,
          presentationId: 1,
          liquorTypeId: 1,
        },
      )
      .sort({ name: 1 })
      .populate(REF_POPULATE);
  }

  async existsByUnit(unitId: string): Promise<boolean> {
    if (!isValidObjectId(unitId)) return false;
    const result = await this.productModel.exists({
      $or: [
        { basicUnitId: new Types.ObjectId(unitId) },
        { packageUnitId: new Types.ObjectId(unitId) },
      ],
    });
    return result !== null;
  }

  async existsByPresentation(presentationId: string): Promise<boolean> {
    if (!isValidObjectId(presentationId)) return false;
    const result = await this.productModel.exists({
      presentationId: new Types.ObjectId(presentationId),
    });
    return result !== null;
  }

  async existsByLiquorType(liquorTypeId: string): Promise<boolean> {
    if (!isValidObjectId(liquorTypeId)) return false;
    const result = await this.productModel.exists({
      liquorTypeId: new Types.ObjectId(liquorTypeId),
    });
    return result !== null;
  }
}
