import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types, isValidObjectId } from 'mongoose';
import { Client, ClientDocument } from './schemas/client.schema';
import { UsersService } from '../users/users.service';
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
    private usersService: UsersService,
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

  async create(data: CreateClientData): Promise<ClientDocument> {
    await this.assertSalesPerson(data.salesPersonId);
    try {
      const created = await this.clientModel.create({
        ...data,
        salesPersonId: new Types.ObjectId(data.salesPersonId),
      });
      await created.populate('salesPersonId', 'name');
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
    opts?: { salesPersonId?: string },
  ): Promise<{ data: ClientDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const filter: FilterQuery<Client> = {};
    if (opts?.salesPersonId) {
      filter.salesPersonId = new Types.ObjectId(opts.salesPersonId);
    }
    const [data, total] = await Promise.all([
      this.clientModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('salesPersonId', 'name'),
      this.clientModel.countDocuments(filter),
    ]);
    return { data, total };
  }

  async findById(id: string): Promise<ClientDocument | null> {
    if (!isValidObjectId(id)) return null;
    return this.clientModel.findById(id).populate('salesPersonId', 'name');
  }

  async update(
    id: string,
    data: UpdateClientInput,
  ): Promise<ClientDocument | null> {
    if (data.salesPersonId) {
      await this.assertSalesPerson(data.salesPersonId);
    }
    const { salesPersonId, ...rest } = data;
    const update: Record<string, unknown> = { ...rest };
    if (salesPersonId !== undefined) {
      update.salesPersonId = new Types.ObjectId(salesPersonId);
    }
    try {
      return await this.clientModel
        .findByIdAndUpdate(id, update, { new: true })
        .populate('salesPersonId', 'name');
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
    return docs.map((d) => ({ id: d.id, name: d.name, rif: d.rif }));
  }
}
