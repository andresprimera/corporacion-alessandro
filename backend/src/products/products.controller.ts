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
  PopulatedRefBase,
  readPopulatedRef,
} from '../common/utils/populated-ref';
import {
  type LiquorTypeRef,
  type PaginatedResponse,
  type PresentationRef,
  type Product,
  type ProductOption,
  type Currency,
  type UnitRef,
} from '@base-dashboard/shared';
import {
  productListQuerySchema,
  type ProductListQuery,
} from './dto/list-product.dto';
import {
  createProductSchema,
  type CreateProductInput,
} from './dto/create-product.dto';
import {
  updateProductSchema,
  type UpdateProductInput,
} from './dto/update-product.dto';

interface PopulatedNamedRef extends PopulatedRefBase {
  name?: string;
  abbreviation?: string;
}

function toUnitRef(
  ref: ProductDocument['basicUnitId'] | ProductDocument['packageUnitId'],
): { id: string; ref?: UnitRef } | undefined {
  if (!ref) return undefined;
  const r = readPopulatedRef<PopulatedNamedRef>(ref);
  if (!r.doc?.name || !r.doc?.abbreviation) {
    return { id: r.id };
  }
  return {
    id: r.id,
    ref: {
      id: r.id,
      name: r.doc.name,
      abbreviation: r.doc.abbreviation,
    },
  };
}

function toPresentationRef(
  ref: ProductDocument['presentationId'],
): { id: string; ref?: PresentationRef } | undefined {
  if (!ref) return undefined;
  const r = readPopulatedRef<PopulatedNamedRef>(ref);
  if (!r.doc?.name || !r.doc?.abbreviation) {
    return { id: r.id };
  }
  return {
    id: r.id,
    ref: {
      id: r.id,
      name: r.doc.name,
      abbreviation: r.doc.abbreviation,
    },
  };
}

function toLiquorTypeRef(
  ref: ProductDocument['liquorTypeId'],
): { id: string; ref?: LiquorTypeRef } | undefined {
  if (!ref) return undefined;
  const r = readPopulatedRef<PopulatedNamedRef>(ref);
  if (!r.doc?.name || !r.doc?.abbreviation) {
    return { id: r.id };
  }
  return {
    id: r.id,
    ref: {
      id: r.id,
      name: r.doc.name,
      abbreviation: r.doc.abbreviation,
    },
  };
}

function toProduct(doc: ProductDocument): Product {
  const basic = toUnitRef(doc.basicUnitId);
  const pkg = toUnitRef(doc.packageUnitId);
  const base = {
    id: doc.id,
    name: doc.name,
    price: {
      value: doc.price.value,
      currency: doc.price.currency as Currency,
    },
    basicUnitId: basic?.id ?? '',
    packageUnitId: pkg?.id,
    unitsPerPackage: doc.unitsPerPackage,
    basicUnit: basic?.ref,
    packageUnit: pkg?.ref,
  };
  if (doc.kind === 'liquor') {
    const presentation = toPresentationRef(doc.presentationId);
    const liquorType = toLiquorTypeRef(doc.liquorTypeId);
    return {
      ...base,
      kind: 'liquor',
      liquorTypeId: liquorType?.id ?? '',
      liquorType: liquorType?.ref,
      presentationId: presentation?.id ?? '',
      presentation: presentation?.ref,
    };
  }
  return { ...base, kind: 'groceries' };
}

function toProductOption(doc: ProductDocument): ProductOption {
  const basic = toUnitRef(doc.basicUnitId);
  const pkg = toUnitRef(doc.packageUnitId);
  return {
    id: doc.id,
    name: doc.name,
    kind: doc.kind === 'liquor' ? 'liquor' : 'groceries',
    price: {
      value: doc.price.value,
      currency: doc.price.currency as Currency,
    },
    basicUnitId: basic?.id ?? '',
    packageUnitId: pkg?.id,
    unitsPerPackage: doc.unitsPerPackage,
    basicUnit: basic?.ref,
    packageUnit: pkg?.ref,
  };
}

@Controller('products')
@UseGuards(RolesGuard)
@Roles('admin')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  @Roles('admin', 'salesPerson')
  async findAll(
    @Query(new ZodValidationPipe(productListQuerySchema))
    query: ProductListQuery,
  ): Promise<PaginatedResponse<Product>> {
    const { data, total } = await this.productsService.findAllPaginated(query);
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
    const docs = await this.productsService.findOptions();
    return docs.map(toProductOption);
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
