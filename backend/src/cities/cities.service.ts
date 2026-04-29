import {
  ConflictException,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { City, CityDocument } from './schemas/city.schema';
import { WarehousesService } from '../warehouses/warehouses.service';
import { isDuplicateKeyError } from '../common/utils/mongo-errors';
import type {
  CreateCityInput,
  UpdateCityInput,
} from '@base-dashboard/shared';

@Injectable()
export class CitiesService {
  constructor(
    @InjectModel(City.name) private cityModel: Model<City>,
    @Inject(forwardRef(() => WarehousesService))
    private warehousesService: WarehousesService,
  ) {}

  async create(data: CreateCityInput): Promise<CityDocument> {
    try {
      return await this.cityModel.create(data);
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw new ConflictException('City name already exists');
      }
      throw err;
    }
  }

  async findAllPaginated(
    page: number,
    limit: number,
    opts?: { onlyActive?: boolean },
  ): Promise<{ data: CityDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const filter = opts?.onlyActive ? { isActive: true } : {};
    const [data, total] = await Promise.all([
      this.cityModel.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
      this.cityModel.countDocuments(filter),
    ]);
    return { data, total };
  }

  async findById(id: string): Promise<CityDocument | null> {
    if (!isValidObjectId(id)) return null;
    return this.cityModel.findById(id);
  }

  async update(
    id: string,
    data: UpdateCityInput,
  ): Promise<CityDocument | null> {
    try {
      return await this.cityModel.findByIdAndUpdate(id, data, { new: true });
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw new ConflictException('City name already exists');
      }
      throw err;
    }
  }

  async findActiveOptions(): Promise<{ id: string; name: string }[]> {
    const docs = await this.cityModel
      .find({ isActive: true }, { name: 1 })
      .sort({ name: 1 });
    return docs.map((d) => ({ id: d.id, name: d.name }));
  }

  async remove(id: string): Promise<void> {
    if (await this.warehousesService.existsByCity(id)) {
      throw new ConflictException(
        'City has warehouses; reassign or delete them first',
      );
    }
    await this.cityModel.findByIdAndDelete(id);
  }
}
