import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { toUser } from './utils/to-user';
import { CitiesService } from '../cities/cities.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  updateUserRoleSchema,
  type UpdateUserRoleInput,
  updateUserStatusSchema,
  type UpdateUserStatusInput,
  updateUserCitySchema,
  type UpdateUserCityInput,
  type PaginatedResponse,
  type SalesPersonOption,
  type User,
} from '@base-dashboard/shared';
import {
  paginationQuerySchema,
  type PaginationQuery,
} from '../common/dto/pagination-query.dto';
import {
  updateProfileSchema,
  type UpdateProfileInput,
} from './dto/update-profile.dto';
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from './dto/change-password.dto';
import {
  createUserSchema,
  type CreateUserInput,
} from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private citiesService: CitiesService,
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

  // --- Current user endpoints (all authenticated users) ---

  @Get('me')
  async getMe(@CurrentUser('userId') userId: string): Promise<User> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return toUser(user);
  }

  @Patch('me')
  async updateProfile(
    @CurrentUser('userId') userId: string,
    @Body(new ZodValidationPipe(updateProfileSchema)) dto: UpdateProfileInput,
  ): Promise<User> {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException('Email already in use');
    }
    const user = await this.usersService.updateProfile(userId, dto);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return toUser(user);
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser('userId') userId: string,
    @Body(new ZodValidationPipe(changePasswordSchema)) dto: ChangePasswordInput,
  ): Promise<void> {
    const user = await this.usersService.findByIdWithPassword(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const passwordValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );
    if (!passwordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);
    await this.usersService.updatePassword(userId, hashedPassword);
  }

  // --- Admin-only endpoints ---

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  async create(
    @Body(new ZodValidationPipe(createUserSchema)) dto: CreateUserInput,
  ): Promise<User> {
    const existingUser = await this.usersService.findByEmailExists(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }
    if (dto.cityId) {
      await this.assertActiveCity(dto.cityId);
    }
    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      role: dto.role,
      password: hashedPassword,
      status: dto.role === 'salesPerson' ? 'approved' : undefined,
      cityId: dto.cityId,
    });
    return toUser(user);
  }

  @Get('sales-persons/options')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getSalesPersonOptions(): Promise<SalesPersonOption[]> {
    return this.usersService.findSalesPersonOptions();
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  async findAll(
    @Query(new ZodValidationPipe(paginationQuerySchema))
    query: PaginationQuery,
  ): Promise<PaginatedResponse<User>> {
    const { data, total } = await this.usersService.findAllPaginated(
      query.page,
      query.limit,
    );
    return {
      data: data.map(toUser),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  @Patch(':id/role')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async updateRole(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUserRoleSchema)) dto: UpdateUserRoleInput,
    @CurrentUser('userId') currentUserId: string,
  ): Promise<User> {
    if (id === currentUserId) {
      throw new ForbiddenException('Cannot change your own role');
    }
    const user = await this.usersService.updateRole(id, dto.role);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return toUser(user);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async updateStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUserStatusSchema))
    dto: UpdateUserStatusInput,
    @CurrentUser('userId') currentUserId: string,
  ): Promise<User> {
    if (id === currentUserId) {
      throw new ForbiddenException('Cannot change your own status');
    }
    const target = await this.usersService.findById(id);
    if (!target) {
      throw new NotFoundException('User not found');
    }
    if (target.role !== 'salesPerson') {
      throw new BadRequestException('User is not a sales person');
    }
    const user = await this.usersService.updateStatus(id, dto.status);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return toUser(user);
  }

  @Patch(':id/city')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async updateCity(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUserCitySchema))
    dto: UpdateUserCityInput,
    @CurrentUser('userId') currentUserId: string,
  ): Promise<User> {
    if (id === currentUserId) {
      throw new ForbiddenException('Cannot change your own city');
    }
    const target = await this.usersService.findById(id);
    if (!target) {
      throw new NotFoundException('User not found');
    }
    if (target.role !== 'salesPerson') {
      throw new BadRequestException('User is not a sales person');
    }
    await this.assertActiveCity(dto.cityId);
    const user = await this.usersService.updateCity(id, dto.cityId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return toUser(user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentUser('userId') currentUserId: string,
  ): Promise<void> {
    if (id === currentUserId) {
      throw new ForbiddenException('Cannot delete your own account');
    }
    await this.usersService.remove(id);
  }
}
