import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { type SignupInput } from './dto/signup.dto';
import { type LoginInput } from './dto/login.dto';
import { type AuthResponse, type Role } from '@base-dashboard/shared';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async signup(dto: SignupInput): Promise<AuthResponse> {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const userCount = await this.usersService.countUsers();
    const role = userCount === 0 ? 'admin' : 'user';

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = await this.usersService.create({
      ...dto,
      password: hashedPassword,
      role,
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.updateStoredRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: { id: user.id, email: user.email, name: user.name, role: user.role as Role },
    };
  }

  async login(dto: LoginInput): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.updateStoredRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: { id: user.id, email: user.email, name: user.name, role: user.role as Role },
    };
  }

  async refreshTokens(
    userId: string,
    refreshToken: string,
  ): Promise<AuthResponse> {
    const user = await this.usersService.findByIdWithRefreshToken(userId);
    if (!user || !user.hashedRefreshToken) {
      throw new UnauthorizedException('Access denied');
    }

    const tokenMatches = await bcrypt.compare(
      refreshToken,
      user.hashedRefreshToken,
    );
    if (!tokenMatches) {
      throw new UnauthorizedException('Access denied');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.updateStoredRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: { id: user.id, email: user.email, name: user.name, role: user.role as Role },
    };
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.updateRefreshToken(userId, null);
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.getOrThrow<string>('JWT_ACCESS_EXPIRATION') as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.getOrThrow<string>('JWT_REFRESH_EXPIRATION') as any,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateStoredRefreshToken(
    userId: string,
    refreshToken: string,
  ) {
    const hashed = await bcrypt.hash(refreshToken, 12);
    await this.usersService.updateRefreshToken(userId, hashed);
  }
}
