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
import { PresentationsService } from './presentations.service';
import { PresentationDocument } from './schemas/presentation.schema';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  type PaginatedResponse,
  type Presentation,
  type PresentationListQuery,
  type PresentationOption,
  presentationListQuerySchema,
} from '@base-dashboard/shared';
import {
  createPresentationSchema,
  type CreatePresentationInput,
} from './dto/create-presentation.dto';
import {
  updatePresentationSchema,
  type UpdatePresentationInput,
} from './dto/update-presentation.dto';

function toPresentation(doc: PresentationDocument): Presentation {
  return {
    id: doc.id,
    name: doc.name,
    abbreviation: doc.abbreviation,
    createdAt: doc.get('createdAt').toISOString(),
    updatedAt: doc.get('updatedAt').toISOString(),
  };
}

@Controller('presentations')
@UseGuards(RolesGuard)
@Roles('admin')
export class PresentationsController {
  constructor(private presentationsService: PresentationsService) {}

  @Get()
  async findAll(
    @Query(new ZodValidationPipe(presentationListQuerySchema))
    query: PresentationListQuery,
  ): Promise<PaginatedResponse<Presentation>> {
    const { data, total } = await this.presentationsService.findAllPaginated(
      query.page,
      query.limit,
      { search: query.search },
    );
    return {
      data: data.map(toPresentation),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
    };
  }

  @Get('options')
  async findOptions(): Promise<PresentationOption[]> {
    return this.presentationsService.findOptions();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Presentation> {
    const presentation = await this.presentationsService.findById(id);
    if (!presentation) {
      throw new NotFoundException('Presentation not found');
    }
    return toPresentation(presentation);
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createPresentationSchema))
    dto: CreatePresentationInput,
  ): Promise<Presentation> {
    const presentation = await this.presentationsService.create(dto);
    return toPresentation(presentation);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePresentationSchema))
    dto: UpdatePresentationInput,
  ): Promise<Presentation> {
    const updated = await this.presentationsService.update(id, dto);
    if (!updated) {
      throw new NotFoundException('Presentation not found');
    }
    return toPresentation(updated);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.presentationsService.remove(id);
  }
}
