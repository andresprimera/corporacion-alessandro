import {
  BadRequestException,
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
import { ProductsService } from './products.service';
import { ProductDocument } from './schemas/product.schema';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  type LiquorType,
  type PaginatedResponse,
  type Presentation,
  type Product,
  type ProductKind,
  type ProductOption,
  type Currency,
} from '@base-dashboard/shared';
import {
  paginationQuerySchema,
  type PaginationQuery,
} from '../common/dto/pagination-query.dto';
import {
  createProductSchema,
  type CreateProductInput,
} from './dto/create-product.dto';
import {
  updateProductSchema,
  type UpdateProductInput,
} from './dto/update-product.dto';

function toProduct(doc: ProductDocument): Product {
  const base = {
    id: doc.id,
    name: doc.name,
    price: {
      value: doc.price.value,
      currency: doc.price.currency as Currency,
    },
  };
  if (doc.kind === 'liquor') {
    return {
      ...base,
      kind: 'liquor',
      liquorType: doc.liquorType as LiquorType,
      presentation: doc.presentation as Presentation,
    };
  }
  return { ...base, kind: 'groceries' };
}

@Controller('products')
@UseGuards(RolesGuard)
@Roles('admin')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  async findAll(
    @Query(new ZodValidationPipe(paginationQuerySchema))
    query: PaginationQuery,
  ): Promise<PaginatedResponse<Product>> {
    const { data, total } = await this.productsService.findAllPaginated(
      query.page,
      query.limit,
    );
    return {
      data: data.map(toProduct),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  @Get('options')
  @Roles('admin', 'salesPerson')
  async findOptions(): Promise<ProductOption[]> {
    const opts = await this.productsService.findOptions();
    return opts.map((o) => ({
      id: o.id,
      name: o.name,
      kind: o.kind as ProductKind,
      price: {
        value: o.price.value,
        currency: o.price.currency as Currency,
      },
    }));
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Product> {
    const product = await this.productsService.findById(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return toProduct(product);
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createProductSchema)) dto: CreateProductInput,
  ): Promise<Product> {
    const product = await this.productsService.create(dto);
    return toProduct(product);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateProductSchema)) dto: UpdateProductInput,
  ): Promise<Product> {
    const existing = await this.productsService.findById(id);
    if (!existing) {
      throw new NotFoundException('Product not found');
    }
    if (existing.kind !== dto.kind) {
      throw new BadRequestException('Cannot change product kind');
    }
    const updated = await this.productsService.update(id, dto);
    if (!updated) {
      throw new NotFoundException('Product not found');
    }
    return toProduct(updated);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.productsService.remove(id);
  }
}
