import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import type {
  CreateProductInput,
  UpdateProductInput,
} from '@base-dashboard/shared';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>,
  ) {}

  async create(data: CreateProductInput): Promise<ProductDocument> {
    return this.productModel.create(data);
  }

  async findAllPaginated(
    page: number,
    limit: number,
  ): Promise<{ data: ProductDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.productModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      this.productModel.countDocuments(),
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

  async findOptions(): Promise<{ id: string; name: string; kind: string }[]> {
    const docs = await this.productModel
      .find({}, { name: 1, kind: 1 })
      .sort({ name: 1 });
    return docs.map((d) => ({ id: d.id, name: d.name, kind: d.kind }));
  }
}
