import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function createMockContext(userRole: string): ExecutionContext {
    return {
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: userRole } }),
      }),
    } as unknown as ExecutionContext;
  }

  function mockReflector(opts: { isPublic?: boolean; roles?: string[] }) {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: unknown) => {
        if (key === IS_PUBLIC_KEY) return opts.isPublic;
        if (key === ROLES_KEY) return opts.roles;
        return undefined;
      });
  }

  it('should allow access when no roles are required', () => {
    mockReflector({});
    const context = createMockContext('user');

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when user has required role', () => {
    mockReflector({ roles: ['admin'] });
    const context = createMockContext('admin');

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access when user does not have required role', () => {
    mockReflector({ roles: ['admin'] });
    const context = createMockContext('user');

    expect(guard.canActivate(context)).toBe(false);
  });

  it('should allow access when user has one of multiple required roles', () => {
    mockReflector({ roles: ['admin', 'moderator'] });
    const context = createMockContext('moderator');

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access when user has none of multiple required roles', () => {
    mockReflector({ roles: ['admin', 'moderator'] });
    const context = createMockContext('user');

    expect(guard.canActivate(context)).toBe(false);
  });

  it('should allow access on a public endpoint regardless of roles metadata', () => {
    mockReflector({ isPublic: true, roles: ['admin'] });
    const context = createMockContext('user');

    expect(guard.canActivate(context)).toBe(true);
  });
});
