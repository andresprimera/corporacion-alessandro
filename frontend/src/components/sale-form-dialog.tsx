import { useTranslation } from "react-i18next"
import {
  useForm,
  useFieldArray,
  useWatch,
  Controller,
  type Control,
} from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createSaleSchema,
  type CreateSaleInput,
} from "@base-dashboard/shared"
import { fetchProductOptionsApi } from "@/lib/products"
import { fetchStockByWarehouseApi } from "@/lib/inventory"
import { fetchClientOptionsApi } from "@/lib/clients"
import { createSaleApi } from "@/lib/sales"
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
import { PlusIcon, TrashIcon } from "lucide-react"

const defaultItem: CreateSaleInput["items"][number] = {
  productId: "",
  requestedQty: 1,
  unitPrice: 0,
  allocations: [{ warehouseId: "", qty: 1 }],
}

const defaultValues: CreateSaleInput = {
  clientId: "",
  notes: "",
  items: [defaultItem],
}

interface AllocationFieldsProps {
  control: Control<CreateSaleInput>
  itemIndex: number
}

function AllocationFields({ control, itemIndex }: AllocationFieldsProps) {
  const { t } = useTranslation()
  const { fields, append, remove } = useFieldArray({
    control,
    name: `items.${itemIndex}.allocations`,
  })
  const productId = useWatch({
    control,
    name: `items.${itemIndex}.productId`,
  })
  const liveAllocations = useWatch({
    control,
    name: `items.${itemIndex}.allocations`,
  })
  const { data: stockData } = useQuery({
    queryKey: ["stock", "by-warehouse", { productId }],
    queryFn: () =>
      fetchStockByWarehouseApi({ productId, page: 1, limit: 100 }),
    enabled: !!productId,
    staleTime: 30_000,
  })
  const stockRows = stockData?.data ?? []

  return (
    <div className="space-y-2 pl-4 border-l">
      <div className="text-sm font-medium text-muted-foreground">
        {t("Warehouse allocations")}
      </div>
      {fields.map((field, idx) => {
        const selectedWarehouseId = liveAllocations?.[idx]?.warehouseId
        const stockRow = stockRows.find(
          (s) => s.warehouseId === selectedWarehouseId,
        )
        return (
          <div key={field.id} className="flex items-end gap-2">
            <Field className="flex-1">
              <FieldLabel
                htmlFor={`items.${itemIndex}.allocations.${idx}.warehouseId`}
              >
                {t("Warehouse")}
              </FieldLabel>
              <Controller
                name={`items.${itemIndex}.allocations.${idx}.warehouseId`}
                control={control}
                render={({ field: warehouseField }) => (
                  <Select
                    value={warehouseField.value || ""}
                    onValueChange={(val) => val && warehouseField.onChange(val)}
                    disabled={!productId}
                  >
                    <SelectTrigger
                      id={`items.${itemIndex}.allocations.${idx}.warehouseId`}
                      size="sm"
                    >
                      <SelectValue
                        placeholder={
                          productId
                            ? t("Select warehouse")
                            : t("Pick a product first")
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {stockRows.map((row) => (
                        <SelectItem
                          key={row.warehouseId}
                          value={row.warehouseId}
                        >
                          {row.warehouseName} ({t("stock")}: {row.totalQty})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {stockRow && (
                <FieldDescription>
                  {t("Available")}: {stockRow.totalQty}
                </FieldDescription>
              )}
            </Field>
            <Field className="w-28">
              <FieldLabel
                htmlFor={`items.${itemIndex}.allocations.${idx}.qty`}
              >
                {t("Qty")}
              </FieldLabel>
              <Controller
                name={`items.${itemIndex}.allocations.${idx}.qty`}
                control={control}
                render={({ field: qtyField }) => (
                  <Input
                    id={`items.${itemIndex}.allocations.${idx}.qty`}
                    type="number"
                    min={1}
                    step={1}
                    value={qtyField.value}
                    onChange={(e) =>
                      qtyField.onChange(Number(e.target.value) || 0)
                    }
                  />
                )}
              />
            </Field>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fields.length > 1 && remove(idx)}
              disabled={fields.length <= 1}
            >
              <TrashIcon className="size-4" />
            </Button>
          </div>
        )
      })}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ warehouseId: "", qty: 1 })}
        disabled={!productId}
      >
        <PlusIcon className="size-4" />
        {t("Add warehouse")}
      </Button>
    </div>
  )
}

export function SaleFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const { data: productOptions = [] } = useQuery({
    queryKey: ["products", "options"],
    queryFn: fetchProductOptionsApi,
    enabled: open,
  })

  const { data: clientOptions = [] } = useQuery({
    queryKey: ["clients", "options"],
    queryFn: fetchClientOptionsApi,
    enabled: open,
  })

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateSaleInput>({
    resolver: standardSchemaResolver(createSaleSchema),
    defaultValues,
  })

  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({ control, name: "items" })

  const items = useWatch({ control, name: "items" }) ?? []
  const totalQty = items.reduce(
    (sum, item) => sum + (Number(item?.requestedQty) || 0),
    0,
  )
  const totalAmount = items.reduce(
    (sum, item) =>
      sum +
      (Number(item?.requestedQty) || 0) * (Number(item?.unitPrice) || 0),
    0,
  )

  const mutation = useMutation({
    mutationFn: createSaleApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] })
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
      queryClient.invalidateQueries({ queryKey: ["stock"] })
      toast.success(t("Sale created"))
      reset(defaultValues)
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error(t(error.message) || t("Failed to create sale"))
    },
  })

  function onSubmit(values: CreateSaleInput) {
    mutation.mutate({
      clientId: values.clientId,
      notes: values.notes?.trim() || undefined,
      items: values.items.map((item) => ({
        productId: item.productId,
        requestedQty: Number(item.requestedQty),
        unitPrice: Number(item.unitPrice),
        allocations: item.allocations.map((a) => ({
          warehouseId: a.warehouseId,
          qty: Number(a.qty),
        })),
      })),
    })
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset(defaultValues)
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("New sale")}</DialogTitle>
          <DialogDescription>
            {t(
              "Pick products and the warehouse(s) they ship from. Mix warehouses if a single one doesn't have enough stock.",
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            <Field>
              <FieldLabel>{t("Client")}</FieldLabel>
              <Controller
                name="clientId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || ""}
                    onValueChange={(val) => val && field.onChange(val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("Select client")} />
                    </SelectTrigger>
                    <SelectContent>
                      {clientOptions.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} ({c.rif})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.clientId && (
                <FieldDescription className="text-destructive">
                  {t(errors.clientId.message ?? "")}
                </FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="sale-notes">{t("Notes")}</FieldLabel>
              <Input id="sale-notes" type="text" {...register("notes")} />
            </Field>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{t("Items")}</div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendItem(defaultItem)}
                >
                  <PlusIcon className="size-4" />
                  {t("Add item")}
                </Button>
              </div>
              {itemFields.map((field, idx) => (
                <div
                  key={field.id}
                  className="space-y-3 rounded-lg border p-3"
                >
                  <div className="flex items-end gap-2">
                    <Field className="flex-1">
                      <FieldLabel htmlFor={`items.${idx}.productId`}>
                        {t("Product")}
                      </FieldLabel>
                      <Controller
                        name={`items.${idx}.productId`}
                        control={control}
                        render={({ field: productField }) => (
                          <Select
                            value={productField.value || ""}
                            onValueChange={(val) =>
                              val && productField.onChange(val)
                            }
                          >
                            <SelectTrigger
                              id={`items.${idx}.productId`}
                              size="sm"
                            >
                              <SelectValue
                                placeholder={t("Select product")}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {productOptions.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </Field>
                    <Field className="w-28">
                      <FieldLabel htmlFor={`items.${idx}.requestedQty`}>
                        {t("Qty")}
                      </FieldLabel>
                      <Input
                        id={`items.${idx}.requestedQty`}
                        type="number"
                        min={1}
                        step={1}
                        {...register(`items.${idx}.requestedQty`, {
                          valueAsNumber: true,
                        })}
                      />
                    </Field>
                    <Field className="w-28">
                      <FieldLabel htmlFor={`items.${idx}.unitPrice`}>
                        {t("Unit price")}
                      </FieldLabel>
                      <Input
                        id={`items.${idx}.unitPrice`}
                        type="number"
                        min={0}
                        step="0.01"
                        {...register(`items.${idx}.unitPrice`, {
                          valueAsNumber: true,
                        })}
                      />
                    </Field>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={itemFields.length <= 1}
                      onClick={() =>
                        itemFields.length > 1 && removeItem(idx)
                      }
                    >
                      <TrashIcon className="size-4" />
                    </Button>
                  </div>
                  <AllocationFields control={control} itemIndex={idx} />
                  {errors.items?.[idx]?.allocations?.message && (
                    <FieldDescription className="text-destructive">
                      {t(errors.items[idx]?.allocations?.message ?? "")}
                    </FieldDescription>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-2">
              <span className="text-sm font-medium">
                {t("Total qty")}: {totalQty}
              </span>
              <span className="text-sm font-medium">
                {t("Total amount")}: ${totalAmount.toFixed(2)}
              </span>
            </div>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? t("Creating...") : t("Create sale")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
