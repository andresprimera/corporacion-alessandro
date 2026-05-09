import {
  ConflictException,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import {
  Presentation,
  PresentationDocument,
} from './schemas/presentation.schema';
import { ProductsService } from '../products/products.service';
import { isDuplicateKeyError } from '../common/utils/mongo-errors';
import type {
  CreatePresentationInput,
  PresentationOption,
  UpdatePresentationInput,
} from '@base-dashboard/shared';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class PresentationsService {
  constructor(
    @InjectModel(Presentation.name)
    private presentationModel: Model<Presentation>,
    @Inject(forwardRef(() => ProductsService))
    private productsService: ProductsService,
  ) {}

  async create(data: CreatePresentationInput): Promise<PresentationDocument> {
    try {
      return await this.presentationModel.create(data);
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw new ConflictException(
          'Presentation name or abbreviation already exists',
        );
      }
      throw err;
    }
  }

  async findAllPaginated(
    page: number,
    limit: number,
    opts?: { search?: string },
  ): Promise<{ data: PresentationDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = {};
    if (opts?.search) {
      filter.name = { $regex: escapeRegex(opts.search), $options: 'i' };
    }
    const [data, total] = await Promise.all([
      this.presentationModel
        .find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      this.presentationModel.countDocuments(filter),
    ]);
    return { data, total };
  }

  async findById(id: string): Promise<PresentationDocument | null> {
    if (!isValidObjectId(id)) return null;
    return this.presentationModel.findById(id);
  }

  async findOptions(): Promise<PresentationOption[]> {
    const docs = await this.presentationModel
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
    const result = await this.presentationModel.exists({ _id: id });
    return result !== null;
  }

  async update(
    id: string,
    data: UpdatePresentationInput,
  ): Promise<PresentationDocument | null> {
    try {
      return await this.presentationModel.findByIdAndUpdate(id, data, {
        new: true,
      });
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw new ConflictException(
          'Presentation name or abbreviation already exists',
        );
      }
      throw err;
    }
  }

  async remove(id: string): Promise<void> {
    if (await this.productsService.existsByPresentation(id)) {
      throw new ConflictException(
        'Presentation is in use by one or more products; reassign them first',
      );
    }
    await this.presentationModel.findByIdAndDelete(id);
  }
}
