import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { ClientsService } from './clients.service';
import { Client } from './schemas/client.schema';
import { UsersService } from '../users/users.service';
import { CitiesService } from '../cities/cities.service';

describe('ClientsService', () => {
  let service: ClientsService;
  let model: Record<string, jest.Mock>;
  const usersService = { findById: jest.fn() };
  const citiesService = { findById: jest.fn() };

  const VALID_SALES_PERSON_ID = '507f1f77bcf86cd799439041';
  const VALID_CITY_ID = '507f1f77bcf86cd799439051';
  const VALID_CLIENT_ID = '507f1f77bcf86cd799439031';

  const baseInput = {
    name: 'Bodega Local',
    rif: 'J-12345678-9',
    address: 'Av. Principal',
    phone: '0414-1234567',
    cityId: VALID_CITY_ID,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    citiesService.findById.mockResolvedValue({
      id: VALID_CITY_ID,
      isActive: true,
    });

    model = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      countDocuments: jest.fn(),
      exists: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        { provide: getModelToken(Client.name), useValue: model },
        { provide: UsersService, useValue: usersService },
        { provide: CitiesService, useValue: citiesService },
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

    it('throws BadRequestException when the city is inactive', async () => {
      usersService.findById.mockResolvedValue({
        id: VALID_SALES_PERSON_ID,
        role: 'salesPerson',
      });
      citiesService.findById.mockResolvedValue({
        id: VALID_CITY_ID,
        isActive: false,
      });

      await expect(
        service.create({ ...baseInput, salesPersonId: VALID_SALES_PERSON_ID }),
      ).rejects.toThrow(BadRequestException);
      expect(model.create).not.toHaveBeenCalled();
    });

    it('stores salesPersonId and cityId as ObjectIds and populates them', async () => {
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
      expect(callArg.cityId).toBeInstanceOf(Types.ObjectId);
      expect(String(callArg.cityId)).toBe(VALID_CITY_ID);
      expect(created.populate).toHaveBeenCalledWith([
        { path: 'salesPersonId', select: 'name' },
        { path: 'cityId', select: 'name' },
      ]);
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
    it('filters by salesPersonId and cityId when provided and populates names', async () => {
      const docs = [{ id: VALID_CLIENT_ID }];
      const finalPopulate = jest.fn().mockResolvedValue(docs);
      const firstPopulate = jest
        .fn()
        .mockReturnValue({ populate: finalPopulate });
      const chainable = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: firstPopulate,
      };
      model.find.mockReturnValue(chainable);
      model.countDocuments.mockResolvedValue(1);

      const result = await service.findAllPaginated(2, 10, {
        salesPersonId: VALID_SALES_PERSON_ID,
        cityId: VALID_CITY_ID,
      });

      const filter = model.find.mock.calls[0][0];
      expect(filter.salesPersonId).toBeInstanceOf(Types.ObjectId);
      expect(String(filter.salesPersonId)).toBe(VALID_SALES_PERSON_ID);
      expect(filter.cityId).toBeInstanceOf(Types.ObjectId);
      expect(String(filter.cityId)).toBe(VALID_CITY_ID);
      expect(chainable.skip).toHaveBeenCalledWith(10);
      expect(chainable.limit).toHaveBeenCalledWith(10);
      expect(firstPopulate).toHaveBeenCalledWith('salesPersonId', 'name');
      expect(finalPopulate).toHaveBeenCalledWith('cityId', 'name');
      expect(result).toEqual({ data: docs, total: 1 });
    });

    it('omits filters when not provided', async () => {
      const finalPopulate = jest.fn().mockResolvedValue([]);
      const firstPopulate = jest
        .fn()
        .mockReturnValue({ populate: finalPopulate });
      const chainable = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: firstPopulate,
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

    it('populates salesPersonId and cityId when looking up by id', async () => {
      const doc = { id: VALID_CLIENT_ID };
      const finalPopulate = jest.fn().mockResolvedValue(doc);
      const firstPopulate = jest
        .fn()
        .mockReturnValue({ populate: finalPopulate });
      const chainable = { populate: firstPopulate };
      model.findById.mockReturnValue(chainable);

      const result = await service.findById(VALID_CLIENT_ID);

      expect(model.findById).toHaveBeenCalledWith(VALID_CLIENT_ID);
      expect(firstPopulate).toHaveBeenCalledWith('salesPersonId', 'name');
      expect(finalPopulate).toHaveBeenCalledWith('cityId', 'name');
      expect(result).toBe(doc);
    });
  });

  describe('update', () => {
    it('asserts the sales person and city when reassigning and converts ids', async () => {
      usersService.findById.mockResolvedValue({
        id: VALID_SALES_PERSON_ID,
        role: 'salesPerson',
      });
      const updated = { id: VALID_CLIENT_ID };
      const finalPopulate = jest.fn().mockResolvedValue(updated);
      const firstPopulate = jest
        .fn()
        .mockReturnValue({ populate: finalPopulate });
      model.findByIdAndUpdate.mockReturnValue({ populate: firstPopulate });

      const result = await service.update(VALID_CLIENT_ID, {
        name: 'Renamed',
        salesPersonId: VALID_SALES_PERSON_ID,
        cityId: VALID_CITY_ID,
      });

      const [, updatePayload] = model.findByIdAndUpdate.mock.calls[0];
      expect(updatePayload.name).toBe('Renamed');
      expect(updatePayload.salesPersonId).toBeInstanceOf(Types.ObjectId);
      expect(String(updatePayload.salesPersonId)).toBe(VALID_SALES_PERSON_ID);
      expect(updatePayload.cityId).toBeInstanceOf(Types.ObjectId);
      expect(String(updatePayload.cityId)).toBe(VALID_CITY_ID);
      expect(firstPopulate).toHaveBeenCalledWith('salesPersonId', 'name');
      expect(finalPopulate).toHaveBeenCalledWith('cityId', 'name');
      expect(result).toBe(updated);
    });

    it('does not touch salesPersonId or cityId when omitted from the payload', async () => {
      const updated = { id: VALID_CLIENT_ID };
      const finalPopulate = jest.fn().mockResolvedValue(updated);
      const firstPopulate = jest
        .fn()
        .mockReturnValue({ populate: finalPopulate });
      model.findByIdAndUpdate.mockReturnValue({ populate: firstPopulate });

      await service.update(VALID_CLIENT_ID, { name: 'Renamed' });

      expect(usersService.findById).not.toHaveBeenCalled();
      const [, updatePayload] = model.findByIdAndUpdate.mock.calls[0];
      expect(updatePayload).toEqual({ name: 'Renamed' });
    });

    it('translates duplicate-key errors into ConflictException', async () => {
      const dupErr = Object.assign(new Error('duplicate'), { code: 11000 });
      const finalPopulate = jest.fn().mockRejectedValue(dupErr);
      const firstPopulate = jest
        .fn()
        .mockReturnValue({ populate: finalPopulate });
      model.findByIdAndUpdate.mockReturnValue({ populate: firstPopulate });

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

  describe('existsByCity', () => {
    it('returns true when there is a client with the city', async () => {
      model.exists.mockResolvedValue({ _id: 'something' });

      const result = await service.existsByCity(VALID_CITY_ID);

      expect(model.exists).toHaveBeenCalledWith({ cityId: VALID_CITY_ID });
      expect(result).toBe(true);
    });

    it('returns false when there is no client with the city', async () => {
      model.exists.mockResolvedValue(null);

      expect(await service.existsByCity(VALID_CITY_ID)).toBe(false);
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
