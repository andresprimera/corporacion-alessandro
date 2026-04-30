import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Warehouse,
  WarehouseDocument,
} from './schemas/warehouse.schema';
import { CitiesService } from '../cities/cities.service';
import { InventoryService } from '../inventory/inventory.service';
import { isDuplicateKeyError } from '../common/utils/mongo-errors';
import type {
  CreateWarehouseInput,
  UpdateWarehouseInput,
} from '@base-dashboard/shared';

@Injectable()
export class WarehousesService {
  constructor(
    @InjectModel(Warehouse.name)
    private warehouseModel: Model<Warehouse>,
    @Inject(forwardRef(() => CitiesService))
    private citiesService: CitiesService,
    @Inject(forwardRef(() => InventoryService))
    private inventoryService: InventoryService,
  ) {}

  private async assertActiveCity(cityId: string): Promise<void> {
    const city = await this.citiesService.findById(cityId);
    if (!city) {
      throw new NotFoundException('City not found');
    }
    if (!city.isActive) {
      throw new BadRequestException('City is inactive');
    }
  }

  async create(data: CreateWarehouseInput): Promise<WarehouseDocument> {
    await this.assertActiveCity(data.cityId);
    try {
      const created = await this.warehouseModel.create({
        ...data,
        cityId: new Types.ObjectId(data.cityId),
      });
      await created.populate('cityId', 'name');
      return created;
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw new ConflictException('Warehouse name already exists');
      }
      throw err;
    }
  }

  async findAllPaginated(
    page: number,
    limit: number,
    opts?: { onlyActive?: boolean },
  ): Promise<{ data: WarehouseDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const filter = opts?.onlyActive ? { isActive: true } : {};
    const [data, total] = await Promise.all([
      this.warehouseModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('cityId', 'name'),
      this.warehouseModel.countDocuments(filter),
    ]);
    return { data, total };
  }

  async findById(id: string): Promise<WarehouseDocument | null> {
    return this.warehouseModel.findById(id).populate('cityId', 'name');
  }

  async update(
    id: string,
    data: UpdateWarehouseInput,
  ): Promise<WarehouseDocument | null> {
    if (data.cityId) {
      await this.assertActiveCity(data.cityId);
    }
    const { cityId, ...rest } = data;
    const update: Partial<Warehouse> = { ...rest };
    if (cityId !== undefined) {
      update.cityId = new Types.ObjectId(cityId);
    }
    try {
      return await this.warehouseModel
        .findByIdAndUpdate(id, update, { new: true })
        .populate('cityId', 'name');
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw new ConflictException('Warehouse name already exists');
      }
      throw err;
    }
  }

  async remove(id: string): Promise<void> {
    if (await this.inventoryService.existsByWarehouse(id)) {
      throw new ConflictException(
        'Warehouse has transactions; deactivate it instead',
      );
    }
    await this.warehouseModel.findByIdAndDelete(id);
  }

  async findActiveOptions(): Promise<
    { id: string; name: string; cityName?: string }[]
  > {
    const docs = await this.warehouseModel
      .find({ isActive: true }, { name: 1, cityId: 1 })
      .sort({ name: 1 })
      .populate<{ cityId: { _id: unknown; name: string } | null }>(
        'cityId',
        'name',
      );
    return docs.map((d) => ({
      id: d.id,
      name: d.name,
      cityName:
        d.cityId && typeof d.cityId === 'object' && 'name' in d.cityId
          ? d.cityId.name
          : undefined,
    }));
  }

  async existsByCity(cityId: string): Promise<boolean> {
    const result = await this.warehouseModel.exists({ cityId });
    return result !== null;
  }

  async findActiveByCity(cityId: string): Promise<WarehouseDocument[]> {
    return this.warehouseModel
      .find({ cityId: new Types.ObjectId(cityId), isActive: true })
      .sort({ name: 1 });
  }
}
