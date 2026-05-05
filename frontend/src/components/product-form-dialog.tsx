import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useForm, Controller, useWatch } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  currencyEnum,
  liquorTypeEnum,
  presentationEnum,
  priceSchema,
  productKindEnum,
  type CreateProductInput,
  type LiquorType,
  type Presentation,
  type Product,
} from "@base-dashboard/shared"
import { z } from "zod/v4"
import { createProductApi, updateProductApi } from "@/lib/products"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"

const productFormSchema = z
  .object({
    kind: productKindEnum,
    name: z.string().min(1, "Name is required"),
    price: priceSchema,
    liquorType: liquorTypeEnum.optional(),
    presentation: presentationEnum.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.kind === "liquor") {
      if (!data.liquorType) {
        ctx.addIssue({
          code: "custom",
          path: ["liquorType"],
          message: "Liquor type is required",
        })
      }
      if (!data.presentation) {
        ctx.addIssue({
          code: "custom",
          path: ["presentation"],
          message: "Presentation is required",
        })
      }
    }
  })

type ProductFormValues = z.infer<typeof productFormSchema>

const defaultValues: ProductFormValues = {
  kind: "groceries",
  name: "",
  price: { value: 0, currency: "USD" },
}

function productToFormValues(product: Product): ProductFormValues {
  if (product.kind === "liquor") {
    return {
      kind: "liquor",
      name: product.name,
      price: product.price,
      liquorType: product.liquorType,
      presentation: product.presentation,
    }
  }
  return {
    kind: "groceries",
    name: product.name,
    price: product.price,
  }
}

function isLiquorFormValues(
  values: ProductFormValues,
): values is ProductFormValues & {
  liquorType: LiquorType
  presentation: Presentation
} {
  return (
    values.kind === "liquor" &&
    values.liquorType !== undefined &&
    values.presentation !== undefined
  )
}

function formValuesToPayload(values: ProductFormValues): CreateProductInput {
  if (isLiquorFormValues(values)) {
    return {
      kind: "liquor",
      name: values.name,
      price: values.price,
      liquorType: values.liquorType,
      presentation: values.presentation,
    }
  }
  return {
    kind: "groceries",
    name: values.name,
    price: values.price,
  }
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const isEdit = product !== undefined

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<ProductFormValues>({
    resolver: standardSchemaResolver(productFormSchema),
    defaultValues,
  })

  const kind = useWatch({ control, name: "kind" })

  useEffect(() => {
    if (open) {
      reset(product ? productToFormValues(product) : defaultValues)
    }
  }, [open, product, reset])

  const mutation = useMutation({
    mutationFn: (values: ProductFormValues) => {
      const payload = formValuesToPayload(values)
      return isEdit
        ? updateProductApi(product.id, payload)
        : createProductApi(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      toast.success(isEdit ? t("Product updated") : t("Product created"))
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error(
        t(error.message) ||
          (isEdit
            ? t("Failed to update product")
            : t("Failed to create product")),
      )
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("Edit Product") : t("Add Product")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("Update product details")
              : t("Create a new product")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <FieldGroup>
            <Field>
              <FieldLabel>{t("Kind")}</FieldLabel>
              <Controller
                name="kind"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isEdit}
                    items={{
                      groceries: t("Groceries"),
                      liquor: t("Liquor"),
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="groceries">
                        {t("Groceries")}
                      </SelectItem>
                      <SelectItem value="liquor">{t("Liquor")}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.kind && (
                <FieldDescription className="text-destructive">
                  {t(errors.kind.message ?? "")}
                </FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="product-name">{t("Name")}</FieldLabel>
              <Input id="product-name" type="text" {...register("name")} />
              {errors.name && (
                <FieldDescription className="text-destructive">
                  {t(errors.name.message ?? "")}
                </FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="product-price-value">
                {t("Price")}
              </FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="product-price-value"
                  type="number"
                  step="0.01"
                  min="0"
                  className="flex-1"
                  {...register("price.value", { valueAsNumber: true })}
                />
                <Controller
                  name="price.currency"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencyEnum.options.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              {errors.price?.value && (
                <FieldDescription className="text-destructive">
                  {t(errors.price.value.message ?? "")}
                </FieldDescription>
              )}
              {errors.price?.currency && (
                <FieldDescription className="text-destructive">
                  {t(errors.price.currency.message ?? "")}
                </FieldDescription>
              )}
            </Field>
            {kind === "liquor" && (
              <>
                <Field>
                  <FieldLabel>{t("Liquor type")}</FieldLabel>
                  <Controller
                    name="liquorType"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                        items={{
                          rum: t("Rum"),
                          whisky: t("Whisky"),
                          vodka: t("Vodka"),
                          gin: t("Gin"),
                          tequila: t("Tequila"),
                          other: t("Other"),
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("Select type")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rum">{t("Rum")}</SelectItem>
                          <SelectItem value="whisky">{t("Whisky")}</SelectItem>
                          <SelectItem value="vodka">{t("Vodka")}</SelectItem>
                          <SelectItem value="gin">{t("Gin")}</SelectItem>
                          <SelectItem value="tequila">
                            {t("Tequila")}
                          </SelectItem>
                          <SelectItem value="other">{t("Other")}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.liquorType && (
                    <FieldDescription className="text-destructive">
                      {t(errors.liquorType.message ?? "")}
                    </FieldDescription>
                  )}
                </Field>
                <Field>
                  <FieldLabel>{t("Presentation")}</FieldLabel>
                  <Controller
                    name="presentation"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                        items={{
                          L1: t("1 L"),
                          ML750: t("750 ml"),
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("Select presentation")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="L1">{t("1 L")}</SelectItem>
                          <SelectItem value="ML750">{t("750 ml")}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.presentation && (
                    <FieldDescription className="text-destructive">
                      {t(errors.presentation.message ?? "")}
                    </FieldDescription>
                  )}
                </Field>
              </>
            )}
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? isEdit
                  ? t("Updating...")
                  : t("Creating...")
                : isEdit
                  ? t("Update Product")
                  : t("Create Product")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
