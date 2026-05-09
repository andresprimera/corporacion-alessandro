import {
  ConflictException,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import {
  LiquorType,
  LiquorTypeDocument,
} from './schemas/liquor-type.schema';
import { ProductsService } from '../products/products.service';
import { isDuplicateKeyError } from '../common/utils/mongo-errors';
import type {
  CreateLiquorTypeInput,
  LiquorTypeOption,
  UpdateLiquorTypeInput,
} from '@base-dashboard/shared';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class LiquorTypesService {
  constructor(
    @InjectModel(LiquorType.name)
    private liquorTypeModel: Model<LiquorType>,
    @Inject(forwardRef(() => ProductsService))
    private productsService: ProductsService,
  ) {}

  async create(data: CreateLiquorTypeInput): Promise<LiquorTypeDocument> {
    try {
      return await this.liquorTypeModel.create(data);
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw new ConflictException(
          'Liquor type name or abbreviation already exists',
        );
      }
      throw err;
    }
  }

  async findAllPaginated(
    page: number,
    limit: number,
    opts?: { search?: string },
  ): Promise<{ data: LiquorTypeDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = {};
    if (opts?.search) {
      filter.name = { $regex: escapeRegex(opts.search), $options: 'i' };
    }
    const [data, total] = await Promise.all([
      this.liquorTypeModel
        .find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      this.liquorTypeModel.countDocuments(filter),
    ]);
    return { data, total };
  }

  async findById(id: string): Promise<LiquorTypeDocument | null> {
    if (!isValidObjectId(id)) return null;
    return this.liquorTypeModel.findById(id);
  }

  async findOptions(): Promise<LiquorTypeOption[]> {
    const docs = await this.liquorTypeModel
      .find({}, { name: 1, abbreviation: 1 })
      .sort({ name: 1 });
    return docs.map((d) => ({
      id: d.id,
      name: d.name,
      abbreviation: d.abbreviation,
    }));
  }

  async existsById(id: string): Promise<boolean> {
    if (!isValidObjectId(id)) return false;
    const result = await this.liquorTypeModel.exists({ _id: id });
    return result !== null;
  }

  async update(
    id: string,
    data: UpdateLiquorTypeInput,
  ): Promise<LiquorTypeDocument | null> {
    try {
      return await this.liquorTypeModel.findByIdAndUpdate(id, data, {
        new: true,
      });
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw new ConflictException(
          'Liquor type name or abbreviation already exists',
        );
      }
      throw err;
    }
  }

  async remove(id: string): Promise<void> {
    if (await this.productsService.existsByLiquorType(id)) {
      throw new ConflictException(
        'Liquor type is in use by one or more products; reassign them first',
      );
    }
    await this.liquorTypeModel.findByIdAndDelete(id);
  }
}
