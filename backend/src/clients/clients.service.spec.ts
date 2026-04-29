import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ClientsService } from './clients.service';
import { Client } from './schemas/client.schema';
import { UsersService } from '../users/users.service';

describe('ClientsService', () => {
  let service: ClientsService;
  let model: Record<string, jest.Mock>;
  const usersService = { findById: jest.fn() };

  const VALID_SALES_PERSON_ID = '507f1f77bcf86cd799439041';
  const VALID_CLIENT_ID = '507f1f77bcf86cd799439031';

  const baseInput = {
    name: 'Bodega Local',
    rif: 'J-12345678-9',
    address: 'Av. Principal',
    phone: '0414-1234567',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    model = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      countDocuments: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        { provide: getModelToken(Client.name), useValue: model },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
  });

  describe('create', () => {
    it('throws NotFoundException when sales person id is not a valid object id', async () => {
      await expect(
        service.create({ ...baseInput, salesPersonId: 'not-an-id' }),
      ).rejects.toThrow(NotFoundException);
      expect(usersService.findById).not.toHaveBeenCalled();
      expect(model.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when sales person does not exist', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(
        service.create({ ...baseInput, salesPersonId: VALID_SALES_PERSON_ID }),
      ).rejects.toThrow(NotFoundException);
      expect(model.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when user is not a sales person', async () => {
      usersService.findById.mockResolvedValue({
        id: VALID_SALES_PERSON_ID,
        role: 'user',
      });

      await expect(
        service.create({ ...baseInput, salesPersonId: VALID_SALES_PERSON_ID }),
      ).rejects.toThrow(NotFoundException);
      expect(model.create).not.toHaveBeenCalled();
    });

    it('stores the salesPersonId as an ObjectId and populates it on the returned doc', async () => {
      usersService.findById.mockResolvedValue({
        id: VALID_SALES_PERSON_ID,
        role: 'salesPerson',
      });
      const created = {
        id: VALID_CLIENT_ID,
        ...baseInput,
        populate: jest.fn().mockResolvedValue(undefined),
      };
      model.create.mockResolvedValue(created);

      const result = await service.create({
        ...baseInput,
        salesPersonId: VALID_SALES_PERSON_ID,
      });

      const callArg = model.create.mock.calls[0][0];
      expect(callArg.salesPersonId).toBeInstanceOf(Types.ObjectId);
      expect(String(callArg.salesPersonId)).toBe(VALID_SALES_PERSON_ID);
      expect(created.populate).toHaveBeenCalledWith('salesPersonId', 'name');
      expect(result).toBe(created);
    });

    it('translates duplicate-key errors into ConflictException', async () => {
      usersService.findById.mockResolvedValue({
        id: VALID_SALES_PERSON_ID,
        role: 'salesPerson',
      });
      const dupErr = Object.assign(new Error('duplicate'), { code: 11000 });
      model.create.mockRejectedValue(dupErr);

      await expect(
        service.create({ ...baseInput, salesPersonId: VALID_SALES_PERSON_ID }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAllPaginated', () => {
    it('filters by salesPersonId when provided and populates the sales person name', async () => {
      const docs = [{ id: VALID_CLIENT_ID }];
      const chainable = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(docs),
      };
      model.find.mockReturnValue(chainable);
      model.countDocuments.mockResolvedValue(1);

      const result = await service.findAllPaginated(2, 10, {
        salesPersonId: VALID_SALES_PERSON_ID,
      });

      const filter = model.find.mock.calls[0][0];
      expect(filter.salesPersonId).toBeInstanceOf(Types.ObjectId);
      expect(String(filter.salesPersonId)).toBe(VALID_SALES_PERSON_ID);
      expect(chainable.skip).toHaveBeenCalledWith(10);
      expect(chainable.limit).toHaveBeenCalledWith(10);
      expect(chainable.populate).toHaveBeenCalledWith('salesPersonId', 'name');
      expect(result).toEqual({ data: docs, total: 1 });
    });

    it('omits the salesPersonId filter when not provided', async () => {
      const chainable = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([]),
      };
      model.find.mockReturnValue(chainable);
      model.countDocuments.mockResolvedValue(0);

      await service.findAllPaginated(1, 10);

      expect(model.find.mock.calls[0][0]).toEqual({});
    });
  });

  describe('findById', () => {
    it('returns null for invalid object ids without hitting the database', async () => {
      const result = await service.findById('not-an-id');

      expect(result).toBeNull();
      expect(model.findById).not.toHaveBeenCalled();
    });

    it('populates salesPersonId when looking up by id', async () => {
      const doc = { id: VALID_CLIENT_ID };
      const chainable = { populate: jest.fn().mockResolvedValue(doc) };
      model.findById.mockReturnValue(chainable);

      const result = await service.findById(VALID_CLIENT_ID);

      expect(model.findById).toHaveBeenCalledWith(VALID_CLIENT_ID);
      expect(chainable.populate).toHaveBeenCalledWith('salesPersonId', 'name');
      expect(result).toBe(doc);
    });
  });

  describe('update', () => {
    it('asserts the sales person when reassigning and converts the id to an ObjectId', async () => {
      usersService.findById.mockResolvedValue({
        id: VALID_SALES_PERSON_ID,
        role: 'salesPerson',
      });
      const updated = { id: VALID_CLIENT_ID };
      const chainable = { populate: jest.fn().mockResolvedValue(updated) };
      model.findByIdAndUpdate.mockReturnValue(chainable);

      const result = await service.update(VALID_CLIENT_ID, {
        name: 'Renamed',
        salesPersonId: VALID_SALES_PERSON_ID,
      });

      const [, updatePayload] = model.findByIdAndUpdate.mock.calls[0];
      expect(updatePayload.name).toBe('Renamed');
      expect(updatePayload.salesPersonId).toBeInstanceOf(Types.ObjectId);
      expect(String(updatePayload.salesPersonId)).toBe(VALID_SALES_PERSON_ID);
      expect(chainable.populate).toHaveBeenCalledWith('salesPersonId', 'name');
      expect(result).toBe(updated);
    });

    it('does not touch salesPersonId when it is omitted from the payload', async () => {
      const updated = { id: VALID_CLIENT_ID };
      const chainable = { populate: jest.fn().mockResolvedValue(updated) };
      model.findByIdAndUpdate.mockReturnValue(chainable);

      await service.update(VALID_CLIENT_ID, { name: 'Renamed' });

      expect(usersService.findById).not.toHaveBeenCalled();
      const [, updatePayload] = model.findByIdAndUpdate.mock.calls[0];
      expect(updatePayload).toEqual({ name: 'Renamed' });
    });

    it('translates duplicate-key errors into ConflictException', async () => {
      const dupErr = Object.assign(new Error('duplicate'), { code: 11000 });
      model.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockRejectedValue(dupErr),
      });

      await expect(
        service.update(VALID_CLIENT_ID, { name: 'Renamed' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('deletes the client by id', async () => {
      model.findByIdAndDelete.mockResolvedValue(undefined);

      await service.remove(VALID_CLIENT_ID);

      expect(model.findByIdAndDelete).toHaveBeenCalledWith(VALID_CLIENT_ID);
    });
  });

  describe('findOptions', () => {
    it('filters by salesPersonId when provided and returns minimal projections', async () => {
      const chainable = {
        sort: jest.fn().mockResolvedValue([
          { id: VALID_CLIENT_ID, name: 'Bodega Local', rif: 'J-12345678-9' },
        ]),
      };
      model.find.mockReturnValue(chainable);

      const result = await service.findOptions({
        salesPersonId: VALID_SALES_PERSON_ID,
      });

      const [filter, projection] = model.find.mock.calls[0];
      expect(filter.salesPersonId).toBeInstanceOf(Types.ObjectId);
      expect(String(filter.salesPersonId)).toBe(VALID_SALES_PERSON_ID);
      expect(projection).toEqual({ name: 1, rif: 1 });
      expect(chainable.sort).toHaveBeenCalledWith({ name: 1 });
      expect(result).toEqual([
        { id: VALID_CLIENT_ID, name: 'Bodega Local', rif: 'J-12345678-9' },
      ]);
    });
  });
});
