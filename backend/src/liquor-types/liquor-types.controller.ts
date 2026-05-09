import {
  Body,
  Controller,
  Delete,
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
import { LiquorTypesService } from './liquor-types.service';
import { LiquorTypeDocument } from './schemas/liquor-type.schema';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  type LiquorType,
  type LiquorTypeListQuery,
  type LiquorTypeOption,
  type PaginatedResponse,
  liquorTypeListQuerySchema,
} from '@base-dashboard/shared';
import {
  createLiquorTypeSchema,
  type CreateLiquorTypeInput,
} from './dto/create-liquor-type.dto';
import {
  updateLiquorTypeSchema,
  type UpdateLiquorTypeInput,
} from './dto/update-liquor-type.dto';

function toLiquorType(doc: LiquorTypeDocument): LiquorType {
  return {
    id: doc.id,
    name: doc.name,
    abbreviation: doc.abbreviation,
    createdAt: doc.get('createdAt').toISOString(),
    updatedAt: doc.get('updatedAt').toISOString(),
  };
}

@Controller('liquor-types')
@UseGuards(RolesGuard)
@Roles('admin')
export class LiquorTypesController {
  constructor(private liquorTypesService: LiquorTypesService) {}

  @Get()
  async findAll(
    @Query(new ZodValidationPipe(liquorTypeListQuerySchema))
    query: LiquorTypeListQuery,
  ): Promise<PaginatedResponse<LiquorType>> {
    const { data, total } = await this.liquorTypesService.findAllPaginated(
      query.page,
      query.limit,
      { search: query.search },
    );
    return {
      data: data.map(toLiquorType),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
    };
  }

  @Get('options')
  @Roles('admin', 'salesPerson')
  async findOptions(): Promise<LiquorTypeOption[]> {
    return this.liquorTypesService.findOptions();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<LiquorType> {
    const liquorType = await this.liquorTypesService.findById(id);
    if (!liquorType) {
      throw new NotFoundException('Liquor type not found');
    }
    return toLiquorType(liquorType);
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createLiquorTypeSchema))
    dto: CreateLiquorTypeInput,
  ): Promise<LiquorType> {
    const liquorType = await this.liquorTypesService.create(dto);
    return toLiquorType(liquorType);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateLiquorTypeSchema))
    dto: UpdateLiquorTypeInput,
  ): Promise<LiquorType> {
    const updated = await this.liquorTypesService.update(id, dto);
    if (!updated) {
      throw new NotFoundException('Liquor type not found');
    }
    return toLiquorType(updated);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.liquorTypesService.remove(id);
  }
}
