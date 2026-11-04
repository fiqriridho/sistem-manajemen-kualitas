import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { users } from '@prisma/client';
import { vi } from 'vitest';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { UsersService } from '../users/users.service.js';
import type { AuthUser } from '../common/types/auth-user.js';

const passwordHash = bcrypt.hashSync('secret1', 4);

describe('Auth session validation (unit)', () => {
  const findByEmail = vi.fn();
  const findActiveAuthUserById = vi.fn();
  const sign = vi.fn().mockReturnValue('access-token');

  const authService = new AuthService(
    { sign } as unknown as JwtService,
    { findByEmail } as unknown as UsersService,
  );

  const strategy = new JwtStrategy(
    { get: vi.fn().mockReturnValue('test-secret') } as unknown as ConfigService,
    { findActiveAuthUserById } as unknown as UsersService,
  );

  beforeEach(() => {
    findByEmail.mockReset();
    findActiveAuthUserById.mockReset();
    sign.mockReset().mockReturnValue('access-token');
  });

  describe('AuthService.login', () => {
    const loginDto = (overrides: Partial<LoginDto> = {}): LoginDto => ({
      email: 'admin@example.com',
      password: 'secret1',
      ...overrides,
    });

    const activeUser = (): users => ({
      id: 'user-1',
      email: 'admin@example.com',
      name: 'Admin',
      role: 'ADMIN',
      isActive: true,
      password: passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    } as unknown as users);

    it('returns access token and user without password for active user', async () => {
      const user = activeUser();
      findByEmail.mockResolvedValue(user);

      const result = await authService.login(loginDto());

      expect(sign).toHaveBeenCalledWith({
        sub: 'user-1',
        email: 'admin@example.com',
        role: 'ADMIN',
      });
      expect(result.access_token).toBe('access-token');
      expect(result.user.id).toBe('user-1');
      expect(result.user.email).toBe('admin@example.com');
      expect(result.user.role).toBe('ADMIN');
      expect(result.user.password).toBeUndefined();
    });

    it('rejects inactive user with generic credentials error', async () => {
      const user = activeUser();
      user.isActive = false;
      findByEmail.mockResolvedValue(user);

      await expect(authService.login(loginDto())).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      await expect(authService.login(loginDto())).rejects.toThrow(
        'Invalid credentials',
      );
      expect(sign).not.toHaveBeenCalled();
    });

    it('rejects missing user', async () => {
      findByEmail.mockResolvedValue(null);

      await expect(authService.login(loginDto())).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(sign).not.toHaveBeenCalled();
    });

    it('rejects wrong password', async () => {
      findByEmail.mockResolvedValue(activeUser());

      await expect(
        authService.login(loginDto({ password: 'wrong-password' })),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(sign).not.toHaveBeenCalled();
    });
  });

  describe('JwtStrategy.validate', () => {
    const validPayload = {
      sub: 'token-user',
      email: 'old@example.com',
      role: 'EVALUATOR',
    };

    it('returns current database user role and email', async () => {
      findActiveAuthUserById.mockResolvedValue({
        userId: 'db-user',
        email: 'current@example.com',
        role: 'ADMIN',
      } as AuthUser);

      const result = await strategy.validate(validPayload);

      expect(findActiveAuthUserById).toHaveBeenCalledWith('token-user');
      expect(result).toEqual({
        userId: 'db-user',
        email: 'current@example.com',
        role: 'ADMIN',
      });
    });

    it('rejects inactive user', async () => {
      findActiveAuthUserById.mockResolvedValue(null);

      await expect(strategy.validate(validPayload)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects deleted user', async () => {
      findActiveAuthUserById.mockResolvedValue(null);

      await expect(strategy.validate(validPayload)).rejects.toThrow(
        'Invalid session',
      );
    });

    it('rejects missing sub without querying database', async () => {
      await expect(
        strategy.validate({ ...validPayload, sub: '' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(findActiveAuthUserById).not.toHaveBeenCalled();
    });
    it('rejects unknown payload role without querying database', async () => {
      await expect(
        strategy.validate({ ...validPayload, role: 'GUEST' }),
      ).rejects.toThrow('Invalid token role');
      expect(findActiveAuthUserById).not.toHaveBeenCalled();
    });
  });
});
