import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import type {
  CreateProductInput,
  ProductListQuery,
  UpdateProductInput,
} from '@base-dashboard/shared';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>,
  ) {}

  async create(data: CreateProductInput): Promise<ProductDocument> {
    return this.productModel.create(data);
  }

  async findAllPaginated(
    query: ProductListQuery,
  ): Promise<{ data: ProductDocument[]; total: number }> {
    const { page, limit, kind, liquorType, minPrice, maxPrice, search } = query;
    const filter: FilterQuery<Product> = {};

    if (kind) filter.kind = kind;
    if (liquorType) {
      filter.kind = 'liquor';
      filter.liquorType = liquorType;
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
      this.productModel.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
      this.productModel.countDocuments(filter),
    ]);
    return { data, total };
  }

  async findById(id: string): Promise<ProductDocument | null> {
    return this.productModel.findById(id);
  }

  async update(
    id: string,
    data: UpdateProductInput,
  ): Promise<ProductDocument | null> {
    return this.productModel.findByIdAndUpdate(id, data, { new: true });
  }

  async remove(id: string): Promise<void> {
    await this.productModel.findByIdAndDelete(id);
  }

  async findOptions(): Promise<
    {
      id: string;
      name: string;
      kind: string;
      price: { value: number; currency: string };
    }[]
  > {
    const docs = await this.productModel
      .find({}, { name: 1, kind: 1, price: 1 })
      .sort({ name: 1 });
    return docs.map((d) => ({
      id: d.id,
      name: d.name,
      kind: d.kind,
      price: { value: d.price.value, currency: d.price.currency },
    }));
  }
}
