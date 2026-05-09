import {
  ConflictException,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Unit, UnitDocument } from './schemas/unit.schema';
import { ProductsService } from '../products/products.service';
import { isDuplicateKeyError } from '../common/utils/mongo-errors';
import type {
  CreateUnitInput,
  UnitOption,
  UpdateUnitInput,
} from '@base-dashboard/shared';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class UnitsService {
  constructor(
    @InjectModel(Unit.name) private unitModel: Model<Unit>,
    @Inject(forwardRef(() => ProductsService))
    private productsService: ProductsService,
  ) {}

  async create(data: CreateUnitInput): Promise<UnitDocument> {
    try {
      return await this.unitModel.create(data);
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw new ConflictException(
          'Unit name or abbreviation already exists',
        );
      }
      throw err;
    }
  }

  async findAllPaginated(
    page: number,
    limit: number,
    opts?: { search?: string },
  ): Promise<{ data: UnitDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = {};
    if (opts?.search) {
      filter.name = { $regex: escapeRegex(opts.search), $options: 'i' };
    }
    const [data, total] = await Promise.all([
      this.unitModel.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
      this.unitModel.countDocuments(filter),
    ]);
    return { data, total };
  }

  async findById(id: string): Promise<UnitDocument | null> {
    if (!isValidObjectId(id)) return null;
    return this.unitModel.findById(id);
  }

  async findOptions(): Promise<UnitOption[]> {
    const docs = await this.unitModel
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
    const result = await this.unitModel.exists({ _id: id });
    return result !== null;
  }

  async update(
    id: string,
    data: UpdateUnitInput,
  ): Promise<UnitDocument | null> {
    try {
      return await this.unitModel.findByIdAndUpdate(id, data, { new: true });
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw new ConflictException(
          'Unit name or abbreviation already exists',
        );
      }
      throw err;
    }
  }

  async remove(id: string): Promise<void> {
    if (await this.productsService.existsByUnit(id)) {
      throw new ConflictException(
        'Unit is in use by one or more products; reassign them first',
      );
    }
    await this.unitModel.findByIdAndDelete(id);
  }
}
