import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useForm, Controller, useWatch } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  currencyEnum,
  priceSchema,
  productKindEnum,
  type CreateProductInput,
  type Product,
} from "@base-dashboard/shared"
import { z } from "zod/v4"
import { createProductApi, updateProductApi } from "@/lib/products"
import { fetchUnitOptionsApi } from "@/lib/units"
import { fetchPresentationOptionsApi } from "@/lib/presentations"
import { fetchLiquorTypeOptionsApi } from "@/lib/liquor-types"
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
import { Checkbox } from "@/components/ui/checkbox"
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
    liquorTypeId: z.string().optional(),
    presentationId: z.string().optional(),
    basicUnitId: z.string().min(1, "Basic unit is required"),
    packageUnitId: z.string().optional(),
    unitsPerPackage: z
      .number()
      .int()
      .min(2, "Units per package must be at least 2")
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.kind === "liquor") {
      if (!data.liquorTypeId) {
        ctx.addIssue({
          code: "custom",
          path: ["liquorTypeId"],
          message: "Liquor type is required",
        })
      }
      if (!data.presentationId) {
        ctx.addIssue({
          code: "custom",
          path: ["presentationId"],
          message: "Presentation is required",
        })
      }
    }
    const hasPackageUnit =
      data.packageUnitId !== undefined && data.packageUnitId !== ""
    const hasUnitsPerPackage = data.unitsPerPackage !== undefined
    if (hasPackageUnit !== hasUnitsPerPackage) {
      ctx.addIssue({
        code: "custom",
        path: hasPackageUnit ? ["unitsPerPackage"] : ["packageUnitId"],
        message: "Package unit and units per package must be set together",
      })
    }
  })

type ProductFormValues = z.infer<typeof productFormSchema>

const defaultValues: ProductFormValues = {
  kind: "groceries",
  name: "",
  price: { value: 0, currency: "USD" },
  basicUnitId: "",
}

function productToFormValues(product: Product): ProductFormValues {
  const base = {
    name: product.name,
    price: product.price,
    basicUnitId: product.basicUnitId,
    packageUnitId: product.packageUnitId,
    unitsPerPackage: product.unitsPerPackage,
  }
  if (product.kind === "liquor") {
    return {
      ...base,
      kind: "liquor",
      liquorTypeId: product.liquorTypeId,
      presentationId: product.presentationId,
    }
  }
  return { ...base, kind: "groceries" }
}

function isLiquorFormValues(
  values: ProductFormValues,
): values is ProductFormValues & {
  liquorTypeId: string
  presentationId: string
} {
  return (
    values.kind === "liquor" &&
    values.liquorTypeId !== undefined &&
    values.liquorTypeId !== "" &&
    values.presentationId !== undefined &&
    values.presentationId !== ""
  )
}

function formValuesToPayload(values: ProductFormValues): CreateProductInput {
  const unitFields = {
    basicUnitId: values.basicUnitId,
    packageUnitId: values.packageUnitId,
    unitsPerPackage: values.unitsPerPackage,
  }
  if (isLiquorFormValues(values)) {
    return {
      kind: "liquor",
      name: values.name,
      price: values.price,
      liquorTypeId: values.liquorTypeId,
      presentationId: values.presentationId,
      ...unitFields,
    }
  }
  return {
    kind: "groceries",
    name: values.name,
    price: values.price,
    ...unitFields,
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

  const unitsQuery = useQuery({
    queryKey: ["units", "options"],
    queryFn: fetchUnitOptionsApi,
    enabled: open,
  })
  const units = unitsQuery.data ?? []
  const presentationsQuery = useQuery({
    queryKey: ["presentations", "options"],
    queryFn: fetchPresentationOptionsApi,
    enabled: open,
  })
  const presentations = presentationsQuery.data ?? []
  const liquorTypesQuery = useQuery({
    queryKey: ["liquor-types", "options"],
    queryFn: fetchLiquorTypeOptionsApi,
    enabled: open,
  })
  const liquorTypes = liquorTypesQuery.data ?? []

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    setValue,
  } = useForm<ProductFormValues>({
    resolver: standardSchemaResolver(productFormSchema),
    defaultValues,
  })

  const kind = useWatch({ control, name: "kind" })
  const basicUnitId = useWatch({ control, name: "basicUnitId" })
  const [hasPackage, setHasPackage] = useState(false)

  useEffect(() => {
    if (open) {
      const initial = product ? productToFormValues(product) : defaultValues
      reset(initial)
      setHasPackage(
        product?.packageUnitId !== undefined && product.packageUnitId !== "",
      )
    }
  }, [open, product, reset])

  const mutation = useMutation({
    mutationFn: (values: ProductFormValues) => {
      const payload = formValuesToPayload(values)
      if (!hasPackage) {
        payload.packageUnitId = undefined
        payload.unitsPerPackage = undefined
      }
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

  function handleHasPackageChange(checked: boolean) {
    setHasPackage(checked)
    if (!checked) {
      setValue("packageUnitId", undefined)
      setValue("unitsPerPackage", undefined)
    }
  }

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
            <Field>
              <FieldLabel>{t("Basic unit")}</FieldLabel>
              <Controller
                name="basicUnitId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    items={Object.fromEntries(
                      units.map((u) => [u.id, `${u.name} (${u.abbreviation})`]),
                    )}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("Select basic unit")} />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({u.abbreviation})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.basicUnitId && (
                <FieldDescription className="text-destructive">
                  {t(errors.basicUnitId.message ?? "")}
                </FieldDescription>
              )}
            </Field>
            <Field>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="product-has-package"
                  checked={hasPackage}
                  onCheckedChange={(c) => handleHasPackageChange(c === true)}
                />
                <FieldLabel htmlFor="product-has-package" className="mb-0">
                  {t("Has package?")}
                </FieldLabel>
              </div>
            </Field>
            {hasPackage && (
              <>
                <Field>
                  <FieldLabel>{t("Package unit")}</FieldLabel>
                  <Controller
                    name="packageUnitId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                        items={Object.fromEntries(
                          units
                            .filter((u) => u.id !== basicUnitId)
                            .map((u) => [
                              u.id,
                              `${u.name} (${u.abbreviation})`,
                            ]),
                        )}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t("Select package unit")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {units
                            .filter((u) => u.id !== basicUnitId)
                            .map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.name} ({u.abbreviation})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.packageUnitId && (
                    <FieldDescription className="text-destructive">
                      {t(errors.packageUnitId.message ?? "")}
                    </FieldDescription>
                  )}
                </Field>
                <Field>
                  <FieldLabel htmlFor="product-units-per-package">
                    {t("Units per package")}
                  </FieldLabel>
                  <Input
                    id="product-units-per-package"
                    type="number"
                    step="1"
                    min="2"
                    {...register("unitsPerPackage", {
                      valueAsNumber: true,
                      setValueAs: (v) =>
                        v === "" || v === null || Number.isNaN(v)
                          ? undefined
                          : Number(v),
                    })}
                  />
                  {errors.unitsPerPackage && (
                    <FieldDescription className="text-destructive">
                      {t(errors.unitsPerPackage.message ?? "")}
                    </FieldDescription>
                  )}
                </Field>
              </>
            )}
            {kind === "liquor" && (
              <>
                <Field>
                  <FieldLabel>{t("Liquor type")}</FieldLabel>
                  <Controller
                    name="liquorTypeId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                        items={Object.fromEntries(
                          liquorTypes.map((l) => [
                            l.id,
                            `${l.name} (${l.abbreviation})`,
                          ]),
                        )}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("Select type")} />
                        </SelectTrigger>
                        <SelectContent>
                          {liquorTypes.map((l) => (
                            <SelectItem key={l.id} value={l.id}>
                              {l.name} ({l.abbreviation})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.liquorTypeId && (
                    <FieldDescription className="text-destructive">
                      {t(errors.liquorTypeId.message ?? "")}
                    </FieldDescription>
                  )}
                </Field>
                <Field>
                  <FieldLabel>{t("Presentation")}</FieldLabel>
                  <Controller
                    name="presentationId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                        items={Object.fromEntries(
                          presentations.map((p) => [
                            p.id,
                            `${p.name} (${p.abbreviation})`,
                          ]),
                        )}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("Select presentation")} />
                        </SelectTrigger>
                        <SelectContent>
                          {presentations.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} ({p.abbreviation})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.presentationId && (
                    <FieldDescription className="text-destructive">
                      {t(errors.presentationId.message ?? "")}
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
