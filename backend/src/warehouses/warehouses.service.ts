import {
  ConflictException,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Warehouse,
  WarehouseDocument,
} from './schemas/warehouse.schema';
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
    @Inject(forwardRef(() => InventoryService))
    private inventoryService: InventoryService,
  ) {}

  async create(data: CreateWarehouseInput): Promise<WarehouseDocument> {
    try {
      return await this.warehouseModel.create(data);
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
        .limit(limit),
      this.warehouseModel.countDocuments(filter),
    ]);
    return { data, total };
  }

  async findById(id: string): Promise<WarehouseDocument | null> {
    return this.warehouseModel.findById(id);
  }

  async update(
    id: string,
    data: UpdateWarehouseInput,
  ): Promise<WarehouseDocument | null> {
    try {
      return await this.warehouseModel.findByIdAndUpdate(id, data, {
        new: true,
      });
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

  async findActiveOptions(): Promise<{ id: string; name: string }[]> {
    const docs = await this.warehouseModel
      .find({ isActive: true }, { name: 1 })
      .sort({ name: 1 });
    return docs.map((d) => ({
      id: d.id,
      name: d.name,
    }));
  }

  async findAllActive(): Promise<WarehouseDocument[]> {
    return this.warehouseModel.find({ isActive: true }).sort({ name: 1 });
  }
}
