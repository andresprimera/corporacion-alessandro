import { z } from "zod/v4";

export const currencyEnum = z.enum(["USD"]);
export type Currency = z.infer<typeof currencyEnum>;

export const productKindEnum = z.enum(["groceries", "liquor"]);
export type ProductKind = z.infer<typeof productKindEnum>;

export const liquorTypeEnum = z.enum([
  "rum",
  "whisky",
  "vodka",
  "gin",
  "tequila",
  "other",
]);
export type LiquorType = z.infer<typeof liquorTypeEnum>;

export const presentationEnum = z.enum(["L1", "ML750"]);
export type Presentation = z.infer<typeof presentationEnum>;

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
});

export const liquorProductSchema = z.object({
  id: z.string(),
  kind: z.literal("liquor"),
  name: z.string().min(1, "Name is required"),
  price: priceSchema,
  liquorType: liquorTypeEnum,
  presentation: presentationEnum,
});

export const productSchema = z.discriminatedUnion("kind", [
  groceryProductSchema,
  liquorProductSchema,
]);
export type Product = z.infer<typeof productSchema>;

export const createGroceryProductSchema = groceryProductSchema.omit({
  id: true,
});
export const createLiquorProductSchema = liquorProductSchema.omit({
  id: true,
});
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
});
export type ProductOption = z.infer<typeof productOptionSchema>;
