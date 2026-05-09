import { z } from "zod/v4";

import { liquorTypeRefSchema } from "./liquor-type";
import { paginationQuerySchema } from "./pagination";
import { presentationRefSchema } from "./presentation";
import { unitRefSchema } from "./unit";

export const currencyEnum = z.enum(["USD"]);
export type Currency = z.infer<typeof currencyEnum>;

export const productKindEnum = z.enum(["groceries", "liquor"]);
export type ProductKind = z.infer<typeof productKindEnum>;

export const priceSchema = z.object({
  value: z.number().nonnegative("Price must be zero or greater"),
  currency: currencyEnum,
});
export type Price = z.infer<typeof priceSchema>;

export const groceryProductSchema = z.object({
  id: z.string(),
  kind: z.literal("groceries"),
  name: z.string().min(1, "Name is required"),
  price: priceSchema,
  basicUnitId: z.string().min(1, "Basic unit is required"),
  packageUnitId: z.string().optional(),
  unitsPerPackage: z
    .number()
    .int()
    .min(2, "Units per package must be at least 2")
    .optional(),
  basicUnit: unitRefSchema.optional(),
  packageUnit: unitRefSchema.optional(),
});

export const liquorProductSchema = z.object({
  id: z.string(),
  kind: z.literal("liquor"),
  name: z.string().min(1, "Name is required"),
  price: priceSchema,
  liquorTypeId: z.string().min(1, "Liquor type is required"),
  presentationId: z.string().min(1, "Presentation is required"),
  basicUnitId: z.string().min(1, "Basic unit is required"),
  packageUnitId: z.string().optional(),
  unitsPerPackage: z
    .number()
    .int()
    .min(2, "Units per package must be at least 2")
    .optional(),
  liquorType: liquorTypeRefSchema.optional(),
  presentation: presentationRefSchema.optional(),
  basicUnit: unitRefSchema.optional(),
  packageUnit: unitRefSchema.optional(),
});

export const productSchema = z.discriminatedUnion("kind", [
  groceryProductSchema,
  liquorProductSchema,
]);
export type Product = z.infer<typeof productSchema>;

function refinePackagePair(
  data: { packageUnitId?: string; unitsPerPackage?: number },
  ctx: z.RefinementCtx,
): void {
  const hasPackageUnit =
    data.packageUnitId !== undefined && data.packageUnitId !== "";
  const hasUnitsPerPackage = data.unitsPerPackage !== undefined;
  if (hasPackageUnit !== hasUnitsPerPackage) {
    ctx.addIssue({
      code: "custom",
      path: hasPackageUnit ? ["unitsPerPackage"] : ["packageUnitId"],
      message: "Package unit and units per package must be set together",
    });
  }
}

export const createGroceryProductSchema = groceryProductSchema
  .omit({ id: true, basicUnit: true, packageUnit: true })
  .superRefine(refinePackagePair);
export const createLiquorProductSchema = liquorProductSchema
  .omit({ id: true, basicUnit: true, packageUnit: true })
  .superRefine(refinePackagePair);
export const createProductSchema = z.discriminatedUnion("kind", [
  createGroceryProductSchema,
  createLiquorProductSchema,
]);
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const productOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: productKindEnum,
  price: priceSchema,
  basicUnitId: z.string(),
  packageUnitId: z.string().optional(),
  unitsPerPackage: z.number().int().optional(),
  basicUnit: unitRefSchema.optional(),
  packageUnit: unitRefSchema.optional(),
});
export type ProductOption = z.infer<typeof productOptionSchema>;

export const productListQuerySchema = paginationQuerySchema.extend({
  kind: productKindEnum.optional(),
  liquorTypeId: z.string().min(1).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  search: z.string().min(1).optional(),
});
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
