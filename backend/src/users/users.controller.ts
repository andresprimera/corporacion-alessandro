import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { updateUserRoleSchema, type UpdateUserRoleInput } from '@base-dashboard/shared';

@Controller('users')
@UseGuards(RolesGuard)
@Roles('admin')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  async findAll() {
    const users = await this.usersService.findAll();
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
    }));
  }

  @Patch(':id/role')
  async updateRole(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUserRoleSchema)) dto: UpdateUserRoleInput,
    @CurrentUser('userId') currentUserId: string,
  ) {
    if (id === currentUserId) {
      throw new ForbiddenException('Cannot change your own role');
    }
    const user = await this.usersService.updateRole(id, dto.role);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  @Delete(':id')
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser('userId') currentUserId: string,
  ) {
    if (id === currentUserId) {
      throw new ForbiddenException('Cannot delete your own account');
    }
    await this.usersService.deleteUser(id);
    return { success: true };
  }
}
