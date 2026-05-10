import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { User } from './schemas/user.schema';

describe('UsersService', () => {
  let service: UsersService;
  let model: Record<string, jest.Mock>;

  const mockUser = {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
  };

  beforeEach(async () => {
    model = {
      create: jest.fn(),
      countDocuments: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      exists: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: model },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('create', () => {
    it('creates a user', async () => {
      const data = {
        name: 'Test',
        email: 'test@example.com',
        password: 'hash',
        role: 'user' as const,
      };
      model.create.mockResolvedValue(mockUser);

      const result = await service.create(data);

      expect(model.create).toHaveBeenCalledWith(data);
      expect(result).toBe(mockUser);
    });

    it('passes the status field through and applies default commission for salesPerson', async () => {
      const data = {
        name: 'Sally',
        email: 'sally@example.com',
        password: 'hash',
        role: 'salesPerson' as const,
        status: 'in_revision' as const,
      };
      model.create.mockResolvedValue({ ...mockUser, role: 'salesPerson' });

      await service.create(data);

      expect(model.create).toHaveBeenCalledWith({
        ...data,
        commissionPercentage: 3,
      });
    });

    it('uses the provided commission percentage when creating a salesPerson', async () => {
      const data = {
        name: 'Sally',
        email: 'sally@example.com',
        password: 'hash',
        role: 'salesPerson' as const,
        status: 'approved' as const,
        commissionPercentage: 7.5,
      };
      model.create.mockResolvedValue(mockUser);

      await service.create(data);

      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({ commissionPercentage: 7.5 }),
      );
    });

    it('does not set commission when creating a non-salesPerson', async () => {
      const data = {
        name: 'Test',
        email: 'test@example.com',
        password: 'hash',
        role: 'user' as const,
      };
      model.create.mockResolvedValue(mockUser);

      await service.create(data);

      const callArg = model.create.mock.calls[0][0];
      expect(callArg.commissionPercentage).toBeUndefined();
    });
  });

  describe('countUsers', () => {
    it('returns the user count', async () => {
      model.countDocuments.mockResolvedValue(5);

      const result = await service.countUsers();

      expect(result).toBe(5);
    });
  });

  describe('findAll', () => {
    it('returns all users', async () => {
      model.find.mockResolvedValue([mockUser]);

      const result = await service.findAll();

      expect(result).toEqual([mockUser]);
    });
  });

  describe('findAllPaginated', () => {
    it('returns paginated data with total count', async () => {
      const chainable = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockUser]),
      };
      model.find.mockReturnValue(chainable);
      model.countDocuments.mockResolvedValue(1);

      const result = await service.findAllPaginated(1, 10);

      expect(chainable.skip).toHaveBeenCalledWith(0);
      expect(chainable.limit).toHaveBeenCalledWith(10);
      expect(result).toEqual({ data: [mockUser], total: 1 });
    });

    it('calculates correct skip for page 2', async () => {
      const chainable = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      model.find.mockReturnValue(chainable);
      model.countDocuments.mockResolvedValue(0);

      await service.findAllPaginated(2, 10);

      expect(chainable.skip).toHaveBeenCalledWith(10);
    });
  });

  describe('findByEmail', () => {
    it('finds user by email with password selected', async () => {
      const chainable = {
        select: jest.fn().mockResolvedValue(mockUser),
      };
      model.findOne.mockReturnValue(chainable);

      const result = await service.findByEmail('test@example.com');

      expect(model.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(chainable.select).toHaveBeenCalledWith('+password');
      expect(result).toEqual(mockUser);
    });
  });

  describe('findById', () => {
    it('finds user by id', async () => {
      model.findById.mockResolvedValue(mockUser);

      const result = await service.findById('user-1');

      expect(model.findById).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(mockUser);
    });
  });

  describe('updateRole', () => {
    it('returns null when user does not exist', async () => {
      model.findById.mockResolvedValue(null);

      const result = await service.updateRole('missing', 'admin');

      expect(result).toBeNull();
      expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('updates role only when no status reconciliation is needed', async () => {
      model.findById.mockResolvedValue({ ...mockUser, role: 'user' });
      const updated = { ...mockUser, role: 'admin' };
      model.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await service.updateRole('user-1', 'admin');

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-1',
        { role: 'admin' },
        { new: true },
      );
      expect(result).toEqual(updated);
    });

    it('auto-approves and sets default commission when promoting to salesPerson without existing status', async () => {
      model.findById.mockResolvedValue({ ...mockUser, role: 'user' });
      const updated = {
        ...mockUser,
        role: 'salesPerson',
        status: 'approved',
        commissionPercentage: 3,
      };
      model.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await service.updateRole('user-1', 'salesPerson');

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-1',
        {
          role: 'salesPerson',
          status: 'approved',
          commissionPercentage: 3,
        },
        { new: true },
      );
      expect(result).toEqual(updated);
    });

    it('preserves existing status and commission when role stays salesPerson', async () => {
      model.findById.mockResolvedValue({
        ...mockUser,
        role: 'salesPerson',
        status: 'in_revision',
        commissionPercentage: 5,
      });
      model.findByIdAndUpdate.mockResolvedValue(mockUser);

      await service.updateRole('user-1', 'salesPerson');

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-1',
        { role: 'salesPerson' },
        { new: true },
      );
    });

    it('clears status when demoting from salesPerson', async () => {
      model.findById.mockResolvedValue({
        ...mockUser,
        role: 'salesPerson',
        status: 'approved',
      });
      model.findByIdAndUpdate.mockResolvedValue(mockUser);

      await service.updateRole('user-1', 'user');

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-1',
        { role: 'user', $unset: { status: 1 } },
        { new: true },
      );
    });

    it('clears commission when demoting from salesPerson with a commission', async () => {
      model.findById.mockResolvedValue({
        ...mockUser,
        role: 'salesPerson',
        status: 'approved',
        commissionPercentage: 3,
      });
      model.findByIdAndUpdate.mockResolvedValue(mockUser);

      await service.updateRole('user-1', 'user');

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-1',
        {
          role: 'user',
          $unset: { status: 1, commissionPercentage: 1 },
        },
        { new: true },
      );
    });
  });

  describe('updateStatus', () => {
    it('updates user status and returns updated user', async () => {
      const updated = { ...mockUser, role: 'salesPerson', status: 'approved' };
      model.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await service.updateStatus('user-1', 'approved');

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-1',
        { status: 'approved' },
        { new: true },
      );
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('deletes user by id', async () => {
      model.findByIdAndDelete.mockResolvedValue(mockUser);

      await service.remove('user-1');

      expect(model.findByIdAndDelete).toHaveBeenCalledWith('user-1');
    });
  });

  describe('updateRefreshToken', () => {
    it('updates the hashed refresh token', async () => {
      model.findByIdAndUpdate.mockResolvedValue(undefined);

      await service.updateRefreshToken('user-1', 'hashed-token');

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith('user-1', {
        hashedRefreshToken: 'hashed-token',
      });
    });

    it('sets refresh token to null on logout', async () => {
      model.findByIdAndUpdate.mockResolvedValue(undefined);

      await service.updateRefreshToken('user-1', null);

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith('user-1', {
        hashedRefreshToken: null,
      });
    });
  });

  describe('findByIdWithRefreshToken', () => {
    it('finds user with refresh token selected', async () => {
      const chainable = {
        select: jest.fn().mockResolvedValue(mockUser),
      };
      model.findById.mockReturnValue(chainable);

      const result = await service.findByIdWithRefreshToken('user-1');

      expect(chainable.select).toHaveBeenCalledWith('+hashedRefreshToken');
      expect(result).toEqual(mockUser);
    });
  });

  describe('findByEmailExists', () => {
    it('returns true when user exists', async () => {
      model.exists.mockReturnValue(Promise.resolve({ _id: 'user-1' }));

      const result = await service.findByEmailExists('test@example.com');

      expect(result).toBe(true);
    });

    it('returns false when user does not exist', async () => {
      model.exists.mockReturnValue(Promise.resolve(null));

      const result = await service.findByEmailExists('nobody@example.com');

      expect(result).toBe(false);
    });
  });
});
