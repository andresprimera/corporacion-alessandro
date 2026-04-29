import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientDocument } from './schemas/client.schema';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  PopulatedRefBase,
  readPopulatedRef,
} from '../common/utils/populated-ref';
import {
  type Client,
  type ClientOption,
  type PaginatedResponse,
  type Role,
  clientListQuerySchema,
  type ClientListQuery,
} from '@base-dashboard/shared';
import {
  createClientSchema,
  type CreateClientInput,
} from './dto/create-client.dto';
import {
  updateClientSchema,
  type UpdateClientInput,
} from './dto/update-client.dto';

interface PopulatedSalesPerson extends PopulatedRefBase {
  name?: string;
}

function toClient(doc: ClientDocument): Client {
  const salesPerson = readPopulatedRef<PopulatedSalesPerson>(doc.salesPersonId);
  return {
    id: doc.id,
    name: doc.name,
    rif: doc.rif,
    address: doc.address,
    phone: doc.phone,
    salesPersonId: salesPerson.id,
    salesPersonName: salesPerson.doc?.name,
    createdAt: doc.get('createdAt').toISOString(),
    updatedAt: doc.get('updatedAt').toISOString(),
  };
}

interface AuthUser {
  userId: string;
  name: string;
  role: Role;
}

@Controller('clients')
@UseGuards(RolesGuard)
@Roles('admin', 'salesPerson')
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  @Get()
  async findAll(
    @Query(new ZodValidationPipe(clientListQuerySchema))
    query: ClientListQuery,
    @CurrentUser() user: AuthUser,
  ): Promise<PaginatedResponse<Client>> {
    const salesPersonId =
      user.role === 'salesPerson' ? user.userId : query.salesPersonId;
    const { data, total } = await this.clientsService.findAllPaginated(
      query.page,
      query.limit,
      { salesPersonId },
    );
    return {
      data: data.map(toClient),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
    };
  }

  @Get('options')
  async findOptions(
    @CurrentUser() user: AuthUser,
  ): Promise<ClientOption[]> {
    const salesPersonId =
      user.role === 'salesPerson' ? user.userId : undefined;
    return this.clientsService.findOptions({ salesPersonId });
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<Client> {
    const client = await this.clientsService.findById(id);
    if (!client) {
      throw new NotFoundException('Client not found');
    }
    if (
      user.role === 'salesPerson' &&
      readPopulatedRef(client.salesPersonId).id !== user.userId
    ) {
      throw new ForbiddenException('Cannot access client from another sales person');
    }
    return toClient(client);
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createClientSchema)) dto: CreateClientInput,
    @CurrentUser() user: AuthUser,
  ): Promise<Client> {
    let salesPersonId: string;
    if (user.role === 'salesPerson') {
      salesPersonId = user.userId;
    } else {
      if (!dto.salesPersonId) {
        throw new BadRequestException('Sales person is required');
      }
      salesPersonId = dto.salesPersonId;
    }
    const client = await this.clientsService.create({
      name: dto.name,
      rif: dto.rif,
      address: dto.address,
      phone: dto.phone,
      salesPersonId,
    });
    return toClient(client);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateClientSchema)) dto: UpdateClientInput,
    @CurrentUser() user: AuthUser,
  ): Promise<Client> {
    const existing = await this.clientsService.findById(id);
    if (!existing) {
      throw new NotFoundException('Client not found');
    }
    if (
      user.role === 'salesPerson' &&
      readPopulatedRef(existing.salesPersonId).id !== user.userId
    ) {
      throw new ForbiddenException('Cannot modify client from another sales person');
    }
    const update: UpdateClientInput = { ...dto };
    if (user.role === 'salesPerson') {
      delete update.salesPersonId;
    }
    const updated = await this.clientsService.update(id, update);
    if (!updated) {
      throw new NotFoundException('Client not found');
    }
    return toClient(updated);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    const existing = await this.clientsService.findById(id);
    if (!existing) {
      throw new NotFoundException('Client not found');
    }
    if (
      user.role === 'salesPerson' &&
      readPopulatedRef(existing.salesPersonId).id !== user.userId
    ) {
      throw new ForbiddenException('Cannot delete client from another sales person');
    }
    await this.clientsService.remove(id);
  }
}
