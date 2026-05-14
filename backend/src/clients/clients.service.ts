import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types, isValidObjectId } from 'mongoose';
import { Client, ClientDocument } from './schemas/client.schema';
import { Sale } from '../sales/schemas/sale.schema';
import { UsersService } from '../users/users.service';
import { CitiesService } from '../cities/cities.service';
import { isDuplicateKeyError } from '../common/utils/mongo-errors';
import type {
  ClientOption,
  CreateClientInput,
  UpdateClientInput,
} from '@base-dashboard/shared';

interface CreateClientData extends Omit<CreateClientInput, 'salesPersonId'> {
  salesPersonId: string;
}

@Injectable()
export class ClientsService {
  constructor(
    @InjectModel(Client.name) private clientModel: Model<Client>,
    @InjectModel(Sale.name) private saleModel: Model<Sale>,
    private usersService: UsersService,
    @Inject(forwardRef(() => CitiesService))
    private citiesService: CitiesService,
  ) {}

  private async assertSalesPerson(salesPersonId: string): Promise<void> {
    if (!isValidObjectId(salesPersonId)) {
      throw new NotFoundException('Sales person not found');
    }
    const user = await this.usersService.findById(salesPersonId);
    if (!user || user.role !== 'salesPerson') {
      throw new NotFoundException('Sales person not found');
    }
  }

  private async assertActiveCity(cityId: string): Promise<void> {
    const city = await this.citiesService.findById(cityId);
    if (!city) {
      throw new NotFoundException('City not found');
    }
    if (!city.isActive) {
      throw new BadRequestException('City is inactive');
    }
  }

  async create(data: CreateClientData): Promise<ClientDocument> {
    await this.assertSalesPerson(data.salesPersonId);
    await this.assertActiveCity(data.cityId);
    try {
      const created = await this.clientModel.create({
        ...data,
        salesPersonId: new Types.ObjectId(data.salesPersonId),
        cityId: new Types.ObjectId(data.cityId),
      });
      await created.populate([
        { path: 'salesPersonId', select: 'name' },
        { path: 'cityId', select: 'name' },
      ]);
      return created;
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw new ConflictException(
          'Sales person already has a client with that RIF',
        );
      }
      throw err;
    }
  }

  async findAllPaginated(
    page: number,
    limit: number,
    opts?: { salesPersonId?: string; cityId?: string },
  ): Promise<{ data: ClientDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const filter: FilterQuery<Client> = {};
    if (opts?.salesPersonId) {
      filter.salesPersonId = new Types.ObjectId(opts.salesPersonId);
    }
    if (opts?.cityId) {
      filter.cityId = new Types.ObjectId(opts.cityId);
    }
    const [data, total] = await Promise.all([
      this.clientModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('salesPersonId', 'name')
        .populate('cityId', 'name'),
      this.clientModel.countDocuments(filter),
    ]);
    return { data, total };
  }

  async findById(id: string): Promise<ClientDocument | null> {
    if (!isValidObjectId(id)) return null;
    return this.clientModel
      .findById(id)
      .populate('salesPersonId', 'name')
      .populate('cityId', 'name');
  }

  async update(
    id: string,
    data: UpdateClientInput,
  ): Promise<ClientDocument | null> {
    if (data.salesPersonId) {
      await this.assertSalesPerson(data.salesPersonId);
    }
    if (data.cityId) {
      await this.assertActiveCity(data.cityId);
    }
    const { salesPersonId, cityId, ...rest } = data;
    const update: Record<string, unknown> = { ...rest };
    if (salesPersonId !== undefined) {
      update.salesPersonId = new Types.ObjectId(salesPersonId);
    }
    if (cityId !== undefined) {
      update.cityId = new Types.ObjectId(cityId);
    }
    try {
      return await this.clientModel
        .findByIdAndUpdate(id, update, { new: true })
        .populate('salesPersonId', 'name')
        .populate('cityId', 'name');
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw new ConflictException(
          'Sales person already has a client with that RIF',
        );
      }
      throw err;
    }
  }

  async remove(id: string): Promise<void> {
    await this.clientModel.findByIdAndDelete(id);
  }

  async findOptions(opts?: {
    salesPersonId?: string;
  }): Promise<ClientOption[]> {
    const filter: FilterQuery<Client> = {};
    if (opts?.salesPersonId) {
      filter.salesPersonId = new Types.ObjectId(opts.salesPersonId);
    }
    const docs = await this.clientModel
      .find(filter, { name: 1, rif: 1 })
      .sort({ name: 1 });

    const clientIds = docs.map((d) => d._id);
    const pendingIds = await this.saleModel.distinct('clientId', {
      clientId: { $in: clientIds },
      status: { $in: ['placed', 'paid'] },
    });
    const pendingSet = new Set(pendingIds.map((id) => String(id)));

    return docs.map((d) => ({
      id: d.id,
      name: d.name,
      rif: d.rif,
      hasPendingSale: pendingSet.has(d.id),
    }));
  }

  async existsByCity(cityId: string): Promise<boolean> {
    const result = await this.clientModel.exists({ cityId });
    return result !== null;
  }
}
