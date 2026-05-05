import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useForm, Controller, useWatch } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createInventoryTransactionSchema,
  transactionTypeEnum,
  type CreateInventoryTransactionInput,
  type InventoryTransaction,
} from "@base-dashboard/shared"
import { fetchProductOptionsApi } from "@/lib/products"
import { fetchWarehouseOptionsApi } from "@/lib/warehouses"
import {
  createInventoryTransactionApi,
  transactionTypeLabelKey,
  updateInventoryTransactionApi,
} from "@/lib/inventory"
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

const defaultValues: CreateInventoryTransactionInput = {
  productId: "",
  warehouseId: "",
  transactionType: "inbound",
  batch: "",
  qty: 1,
  notes: "",
  expirationDate: "",
}

function transactionToFormValues(
  tx: InventoryTransaction,
): CreateInventoryTransactionInput {
  return {
    productId: tx.productId,
    warehouseId: tx.warehouseId,
    transactionType: tx.transactionType,
    batch: tx.batch,
    qty: tx.qty,
    notes: tx.notes ?? "",
    expirationDate: tx.expirationDate ? tx.expirationDate.slice(0, 10) : "",
  }
}

function trimToUndefined(value: string | undefined): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export function InventoryFormDialog({
  open,
  onOpenChange,
  transaction,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction?: InventoryTransaction
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const isEdit = transaction !== undefined

  const productsQuery = useQuery({
    queryKey: ["products", "options"],
    queryFn: fetchProductOptionsApi,
    enabled: open,
  })
  const products = productsQuery.data ?? []

  const warehousesQuery = useQuery({
    queryKey: ["warehouses", "options"],
    queryFn: fetchWarehouseOptionsApi,
    enabled: open,
  })
  const warehouses = warehousesQuery.data ?? []

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<CreateInventoryTransactionInput>({
    resolver: standardSchemaResolver(createInventoryTransactionSchema),
    defaultValues,
  })

  const transactionType = useWatch({ control, name: "transactionType" })

  useEffect(() => {
    if (open) {
      reset(
        transaction ? transactionToFormValues(transaction) : defaultValues,
      )
    }
  }, [open, transaction, reset])

  const mutation = useMutation({
    mutationFn: (values: CreateInventoryTransactionInput) => {
      const payload: CreateInventoryTransactionInput = {
        ...values,
        notes: trimToUndefined(values.notes),
        expirationDate: trimToUndefined(values.expirationDate),
      }
      return isEdit
        ? updateInventoryTransactionApi(transaction.id, payload)
        : createInventoryTransactionApi(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
      toast.success(
        isEdit ? t("Transaction updated") : t("Transaction created"),
      )
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error(
        t(error.message) ||
          (isEdit
            ? t("Failed to update transaction")
            : t("Failed to create transaction")),
      )
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("Edit Transaction") : t("Add Transaction")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("Update transaction details")
              : t("Create a new transaction")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <FieldGroup>
            <Field>
              <FieldLabel>{t("Product")}</FieldLabel>
              <Controller
                name="productId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    items={Object.fromEntries(
                      products.map((p) => [p.id, p.name]),
                    )}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("Select product")} />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.productId && (
                <FieldDescription className="text-destructive">
                  {t(errors.productId.message ?? "")}
                </FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel>{t("Warehouse")}</FieldLabel>
              <Controller
                name="warehouseId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    items={Object.fromEntries(
                      warehouses.map((w) => [
                        w.id,
                        w.cityName ? `${w.name} — ${w.cityName}` : w.name,
                      ]),
                    )}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("Select warehouse")} />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.cityName ? `${w.name} — ${w.cityName}` : w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.warehouseId && (
                <FieldDescription className="text-destructive">
                  {t(errors.warehouseId.message ?? "")}
                </FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel>{t("Type")}</FieldLabel>
              <Controller
                name="transactionType"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    items={Object.fromEntries(
                      transactionTypeEnum.options.map((tt) => [
                        tt,
                        t(transactionTypeLabelKey(tt)),
                      ]),
                    )}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {transactionTypeEnum.options.map((tt) => (
                        <SelectItem key={tt} value={tt}>
                          {t(transactionTypeLabelKey(tt))}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.transactionType && (
                <FieldDescription className="text-destructive">
                  {t(errors.transactionType.message ?? "")}
                </FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="tx-batch">{t("Batch")}</FieldLabel>
              <Input id="tx-batch" type="text" {...register("batch")} />
              {errors.batch && (
                <FieldDescription className="text-destructive">
                  {t(errors.batch.message ?? "")}
                </FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="tx-qty">{t("Qty")}</FieldLabel>
              <Input
                id="tx-qty"
                type="number"
                step="1"
                {...register("qty", { valueAsNumber: true })}
              />
              <FieldDescription>
                {transactionType === "adjustment"
                  ? t("Adjustments allow positive or negative quantities")
                  : t(
                      "Quantity must be positive for inbound and outbound transactions",
                    )}
              </FieldDescription>
              {errors.qty && (
                <FieldDescription className="text-destructive">
                  {t(errors.qty.message ?? "")}
                </FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="tx-expiration">
                {t("Expiration date")}
              </FieldLabel>
              <Input
                id="tx-expiration"
                type="date"
                {...register("expirationDate")}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="tx-notes">{t("Notes")}</FieldLabel>
              <Input id="tx-notes" type="text" {...register("notes")} />
            </Field>
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
                  ? t("Update Transaction")
                  : t("Create Transaction")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
