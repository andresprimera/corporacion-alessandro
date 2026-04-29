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
import { CitiesService } from './cities.service';
import { CityDocument } from './schemas/city.schema';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  type City,
  type CityOption,
  type PaginatedResponse,
  cityListQuerySchema,
  type CityListQuery,
} from '@base-dashboard/shared';
import {
  createCitySchema,
  type CreateCityInput,
} from './dto/create-city.dto';
import {
  updateCitySchema,
  type UpdateCityInput,
} from './dto/update-city.dto';

function toCity(doc: CityDocument): City {
  return {
    id: doc.id,
    name: doc.name,
    isActive: doc.isActive,
    createdAt: doc.get('createdAt').toISOString(),
    updatedAt: doc.get('updatedAt').toISOString(),
  };
}

@Controller('cities')
@UseGuards(RolesGuard)
@Roles('admin')
export class CitiesController {
  constructor(private citiesService: CitiesService) {}

  @Get()
  async findAll(
    @Query(new ZodValidationPipe(cityListQuerySchema))
    query: CityListQuery,
  ): Promise<PaginatedResponse<City>> {
    const { data, total } = await this.citiesService.findAllPaginated(
      query.page,
      query.limit,
      { onlyActive: query.onlyActive },
    );
    return {
      data: data.map(toCity),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
    };
  }

  @Get('options')
  @Public()
  async findOptions(): Promise<CityOption[]> {
    return this.citiesService.findActiveOptions();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<City> {
    const city = await this.citiesService.findById(id);
    if (!city) {
      throw new NotFoundException('City not found');
    }
    return toCity(city);
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createCitySchema)) dto: CreateCityInput,
  ): Promise<City> {
    const city = await this.citiesService.create(dto);
    return toCity(city);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCitySchema)) dto: UpdateCityInput,
  ): Promise<City> {
    const updated = await this.citiesService.update(id, dto);
    if (!updated) {
      throw new NotFoundException('City not found');
    }
    return toCity(updated);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.citiesService.remove(id);
  }
}
