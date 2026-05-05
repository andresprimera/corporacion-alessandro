import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useForm, Controller } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createWarehouseSchema,
  type CreateWarehouseInput,
  type Warehouse,
} from "@base-dashboard/shared"
import { createWarehouseApi, updateWarehouseApi } from "@/lib/warehouses"
import { fetchCityOptionsApi } from "@/lib/cities"
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

const defaultValues: CreateWarehouseInput = {
  name: "",
  cityId: "",
  address: "",
  isActive: true,
}

function warehouseToFormValues(warehouse: Warehouse): CreateWarehouseInput {
  return {
    name: warehouse.name,
    cityId: warehouse.cityId,
    address: warehouse.address ?? "",
    isActive: warehouse.isActive,
  }
}

export function WarehouseFormDialog({
  open,
  onOpenChange,
  warehouse,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  warehouse?: Warehouse
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const isEdit = warehouse !== undefined

  const citiesQuery = useQuery({
    queryKey: ["cities", "options"],
    queryFn: fetchCityOptionsApi,
    enabled: open,
  })

  const cities = citiesQuery.data ?? []

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<CreateWarehouseInput>({
    resolver: standardSchemaResolver(createWarehouseSchema),
    defaultValues,
  })

  useEffect(() => {
    if (open) {
      reset(warehouse ? warehouseToFormValues(warehouse) : defaultValues)
    }
  }, [open, warehouse, reset])

  const mutation = useMutation({
    mutationFn: (values: CreateWarehouseInput) => {
      const payload = {
        ...values,
        address: values.address?.trim() ? values.address : undefined,
      }
      return isEdit
        ? updateWarehouseApi(warehouse.id, payload)
        : createWarehouseApi(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] })
      toast.success(isEdit ? t("Warehouse updated") : t("Warehouse created"))
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error(
        t(error.message) ||
          (isEdit
            ? t("Failed to update warehouse")
            : t("Failed to create warehouse")),
      )
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("Edit Warehouse") : t("Add Warehouse")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("Update warehouse details")
              : t("Create a new warehouse")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="warehouse-name">{t("Name")}</FieldLabel>
              <Input id="warehouse-name" type="text" {...register("name")} />
              {errors.name && (
                <FieldDescription className="text-destructive">
                  {t(errors.name.message ?? "")}
                </FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel>{t("City")}</FieldLabel>
              <Controller
                name="cityId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    items={Object.fromEntries(
                      cities.map((c) => [c.id, c.name]),
                    )}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("Select city")} />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.cityId && (
                <FieldDescription className="text-destructive">
                  {t(errors.cityId.message ?? "")}
                </FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="warehouse-address">
                {t("Address")}
              </FieldLabel>
              <Input
                id="warehouse-address"
                type="text"
                {...register("address")}
              />
              {errors.address && (
                <FieldDescription className="text-destructive">
                  {t(errors.address.message ?? "")}
                </FieldDescription>
              )}
            </Field>
            <Field>
              <div className="flex items-center gap-2">
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="warehouse-active"
                      checked={field.value}
                      onCheckedChange={(c) => field.onChange(c === true)}
                    />
                  )}
                />
                <FieldLabel htmlFor="warehouse-active" className="mb-0">
                  {t("Active")}
                </FieldLabel>
              </div>
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
                  ? t("Update Warehouse")
                  : t("Create Warehouse")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
